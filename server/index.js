import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPublicKey, randomBytes, verify } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { REACTION_TYPES, fictionalCharacters } from '../src/data/community.js';
import { FeedStore } from './store.js';
import { CATEGORIES, configuredSources } from './sources.js';
import { buildFeed } from './ranking.js';
import { createIngestion } from './ingest.js';
import { canonicalUrl, contentId, xSourceItem } from './parse.js';
import { decodeBase58, verifyCoin } from './coins.js';

const error = (message, status = 400) => Object.assign(new Error(message), { status });

export function createTweetMintServer({ store = new FeedStore(process.env.FEED_DB_PATH || 'server/data/tweetmint.sqlite'), sources = configuredSources(), ingest = true, fetcher = fetch, port = Number(process.env.PORT) || 8787 } = {}) {
  store.configure(sources);
  const limits = new Map();
  const challenges = new Map();
  const origins = new Set((process.env.APP_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8787,http://127.0.0.1:8787').split(',').map((value) => value.trim()));
  function rateLimit(key, limit) {
    const now = Date.now();
    if (limits.size > 10000) for (const [entry, state] of limits) if (state.until <= now) limits.delete(entry);
    const state = limits.get(key) || { count: 0, until: now + 60_000 };
    if (now >= state.until) { state.count = 0; state.until = now + 60_000; }
    state.count++; limits.set(key, state);
    if (state.count > limit) throw error('Please wait before trying again.', 429);
  }
  const json = (response, body, status = 200) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(JSON.stringify(body));
  };
  async function body(request) {
    if (!String(request.headers['content-type'] || '').startsWith('application/json')) throw error('Send JSON content.', 415);
    let text = '';
    for await (const chunk of request) { text += chunk.toString(); if (Buffer.byteLength(text) > 8192) throw error('Request too large.', 413); }
    try { const data = JSON.parse(text || '{}'); if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error(); return data; }
    catch { throw error('Invalid JSON request.'); }
  }
  function session(request, response, mutation = false) {
    const cookie = /(?:^|;\s*)tweetmint_session=([a-f0-9]{48})(?:;|$)/.exec(request.headers.cookie || '')?.[1];
    const actor = store.session(cookie);
    if (mutation && (actor.isNew || !origins.has(request.headers.origin) || request.headers['sec-fetch-site'] === 'cross-site')) throw error('Open TweetMint in this browser before changing the feed.', 403);
    if (actor.isNew) response.setHeader('Set-Cookie', `tweetmint_session=${actor.id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${process.env.COOKIE_SECURE === '1' ? '; Secure' : ''}`);
    return { id: actor.id, name: `Visitor ${actor.id.slice(0, 4).toUpperCase()}`, type: 'visitor' };
  }
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  const publish = (message) => { for (const client of wss.clients) if (client.readyState === 1) client.send(JSON.stringify(message)); };
  const ingestion = createIngestion(store, { publish, fetcher });
  function coinSource(data, actor) {
    const sourceItem = data.itemId ? store.item(data.itemId, actor.id) : null;
    if (data.itemId && !sourceItem) throw error('The source story does not exist.');
    const sourceUrl = sourceItem?.originalUrl || canonicalUrl(data.sourceUrl);
    const localUpload = data.sourceType === 'local-upload' && /^upload-\d{10,16}-[a-zA-Z0-9]{4,20}$/.test(data.sourceId || '');
    if (!sourceUrl && !localUpload) throw error('A valid original source or preserved local upload is required.');
    let sourceId = sourceItem?.sourceType === 'x' ? `x:${sourceItem.externalId}` : sourceItem ? `${sourceItem.sourceType}:${sourceItem.id}` : sourceUrl ? `url:${contentId(sourceUrl)}` : `local:${data.sourceId}`;
    if (!sourceItem && data.sourceType === 'x' && sourceUrl) {
      try { sourceId = `x:${xSourceItem(sourceUrl).externalId}`; } catch (failure) { throw error(failure.message); }
    }
    return { sourceId, sourceUrl, itemId: sourceItem?.id || null, sourceType: sourceItem?.sourceType || data.sourceType || 'local-upload' };
  }
  const coinBinding = (data, source) => JSON.stringify({ ...source, mintAddress: data.mintAddress, creatorWallet: data.creatorWallet,
    signature: data.signature, name: data.name, ticker: data.ticker, network: data.network || 'mainnet-beta', preparedAt: data.preparedAt });
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (!url.pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(request.method)) return json(response, { error: 'Method not allowed.' }, 405);
        const root = resolve('dist');
        const requested = resolve(root, `.${decodeURIComponent(url.pathname)}`);
        if (!requested.startsWith(`${root}/`) && requested !== root) throw error('Invalid path.');
        const file = existsSync(requested) && extname(requested) ? requested : resolve(root, 'index.html');
        if (!existsSync(file)) return json(response, { error: 'Build the frontend with npm run build, or use npm run dev.' }, 404);
        const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' }[extname(file)] || 'application/octet-stream';
        response.writeHead(200, { 'Content-Type': mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public,max-age=3600' });
        return response.end(request.method === 'HEAD' ? '' : readFileSync(file));
      }
      rateLimit(`ip:${request.socket.remoteAddress}`, request.method === 'POST' ? 120 : 300);
      if (!['GET', 'POST'].includes(request.method)) return json(response, { error: 'Method not allowed.' }, 405);
      const actor = session(request, response, request.method === 'POST');
      if (request.method === 'GET') {
        if (url.pathname === '/api/feed/session') return json(response, { actorName: actor.name });
        if (url.pathname === '/api/feed/categories') return json(response, { categories: CATEGORIES });
        if (url.pathname === '/api/feed/stats') return json(response, store.stats());
        if (url.pathname === '/api/feed/announcements') return json(response, { announcements: store.announcements() });
        if (url.pathname === '/api/feed' || url.pathname === '/api/feed/trending') return json(response, buildFeed(store, url.searchParams, actor.id));
        const id = /^\/api\/feed\/([a-f0-9]{24})$/.exec(url.pathname)?.[1];
        if (id) { const item = store.item(id, actor.id); return item ? json(response, { item, comments: store.comments(id) }) : json(response, { error: 'Story not found.' }, 404); }
      }
      if (request.method === 'POST') {
        rateLimit(`actor:${actor.id}`, 45);
        const data = await body(request);
        if (url.pathname === '/api/feed/refresh') {
          rateLimit('refresh', 3);
          return json(response, await ingestion.run());
        }
        if (url.pathname === '/api/feed/x') {
          if (typeof data.url !== 'string' || data.url.length > 2048) throw error('Enter a valid X URL.');
          let candidate;
          try { candidate = xSourceItem(data.url); } catch (failure) { throw error(failure.message); }
          const inserted = store.insert(candidate);
          const item = inserted ? store.item(inserted.id, actor.id) : store.db.prepare('SELECT id FROM feed_items WHERE provider_key=?').get(candidate.providerKey);
          const resolvedItem = inserted ? item : store.item(item.id, actor.id);
          if (inserted) publish({ type: 'feed-update', itemIds: [inserted.id] });
          return json(response, { item: resolvedItem });
        }
        if (url.pathname === '/api/coins/challenge' || url.pathname === '/api/coins/verify') {
          rateLimit(`coins:${actor.id}`, 5);
          const source = coinSource(data, actor);
          const binding = coinBinding(data, source);
          if (url.pathname === '/api/coins/challenge') {
            try {
              if (decodeBase58(data.creatorWallet).length !== 32 || decodeBase58(data.mintAddress).length !== 32 || decodeBase58(data.signature).length !== 64) throw new Error();
            } catch { throw error('Enter a valid wallet, mint, and launch transaction signature.'); }
            for (const [id, challenge] of challenges) if (challenge.expiresAt <= Date.now()) challenges.delete(id);
            if (challenges.size >= 10000) throw error('Please try again later.', 503);
            const challengeId = randomBytes(24).toString('hex');
            const expiresAt = Date.now() + 300_000;
            const message = `TweetMint launch ownership confirmation\n\nSource: ${source.sourceUrl || source.sourceId}\nCanonical identity: ${source.sourceId}\nMint: ${data.mintAddress}\nCreator wallet: ${data.creatorWallet}\nLaunch transaction: ${data.signature}\nToken: ${data.name} (${data.ticker})\nNonce: ${challengeId}\nExpires: ${new Date(expiresAt).toISOString()}\n\nSigning confirms you control this wallet and want to associate this verified deployment with this source. This message does not authorize a transaction.`;
            challenges.set(challengeId, { actorId: actor.id, binding, message, expiresAt });
            return json(response, { challengeId, message, expiresAt: new Date(expiresAt).toISOString() });
          }
          const challenge = challenges.get(data.challengeId);
          if (!challenge || challenge.expiresAt <= Date.now() || challenge.actorId !== actor.id || challenge.binding !== binding) throw error('Request a new launch ownership confirmation in this browser.', 403);
          if (typeof data.walletSignature !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(data.walletSignature)) throw error('Invalid wallet ownership signature.', 403);
          let owned = false;
          try {
            const key = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), decodeBase58(data.creatorWallet)]), format: 'der', type: 'spki' });
            owned = verify(null, Buffer.from(challenge.message), key, Buffer.from(data.walletSignature, 'base64'));
          } catch { owned = false; }
          if (!owned) throw error('The wallet ownership signature could not be verified.', 403);
          let proof, recorded;
          try {
            proof = await verifyCoin(data, { fetcher });
            recorded = store.recordCoin(source.sourceId, source.itemId, { ...proof, sourceUrl: source.sourceUrl, sourceType: source.sourceType });
          } catch (failure) { throw error(failure.message); }
          challenges.delete(data.challengeId);
          publish({ type: 'coin-confirmed', ...recorded });
          return json(response, recorded);
        }
        const action = /^\/api\/feed\/([a-f0-9]{24})\/(react|comment|share|bookmark)$/.exec(url.pathname);
        if (action) {
          const [, id, kind] = action;
          if (!store.item(id)) throw error('Story not found.', 404);
          let comment = null;
          if (kind === 'react') {
            if (!REACTION_TYPES.includes(data.reaction)) throw error('Unknown pixel reaction.');
            store.engage(id, actor, 'reaction', data.reaction);
          }
          if (kind === 'comment') {
            if (typeof data.content !== 'string' || !data.content.trim() || data.content.trim().length > 1000) throw error('Comments must contain 1–1,000 characters.');
            rateLimit(`comments:${actor.id}`, 8); comment = store.comment(id, actor, data.content.trim());
          }
          if (kind === 'share') store.engage(id, actor, 'share', null, false);
          if (kind === 'bookmark') store.engage(id, actor, 'bookmark');
          if (kind !== 'bookmark') publish({ type: 'engagement-update', itemId: id });
          return json(response, { item: store.item(id, actor.id), ...(comment ? { comment, comments: store.comments(id) } : {}) });
        }
      }
      return json(response, { error: 'Endpoint not found.' }, 404);
    } catch (failure) {
      if (!response.headersSent) json(response, { error: failure.status ? failure.message : 'This request could not be completed. Try again shortly.' }, failure.status || 500);
      if (!failure.status) console.error('TweetMint request:', failure.message);
    }
  });
  server.on('upgrade', (request, socket, head) => {
    if (request.url !== '/api/feed/live' || !origins.has(request.headers.origin)) return socket.destroy();
    try { rateLimit(`ws:${request.socket.remoteAddress}`, 20); } catch { return socket.destroy(); }
    wss.handleUpgrade(request, socket, head, (client) => {
      wss.emit('connection', client, request);
      const item = store.records()[0];
      if (item) {
        const now = new Date().toISOString();
        client.send(JSON.stringify({ type: 'feed-update', itemIds: [], activity: { id: contentId(`cached:${item.id}:${now}`), characterId: fictionalCharacters[0].id,
          type: 'news-read', itemId: item.id, category: item.category, content: 'Reading the original source.', createdAt: now, cached: true } }));
      }
      client.on('error', () => {});
    });
  });
  server.on('close', () => { ingestion.stop(); for (const client of wss.clients) client.terminate(); wss.close(); });
  if (ingest) ingestion.start();
  return { server, store, ingestion, publish, listen: () => new Promise((done) => server.listen(port, process.env.HOST || '127.0.0.1', done)) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const app = createTweetMintServer();
  await app.listen();
  console.log(`TweetMint API listening on http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 8787}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.server.close(async () => {
    await app.ingestion.stop(); app.store.db.close(); process.exit(0);
  }));
}
