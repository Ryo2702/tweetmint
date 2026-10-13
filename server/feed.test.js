import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';
import { FeedStore } from './store.js';
import { parseRss, parseBluesky, xSourceItem, contentId, canonicalUrl } from './parse.js';
import { configuredSources, googleNewsUrl } from './sources.js';
import { buildFeed, discoveryOrder } from './ranking.js';
import { createIngestion } from './ingest.js';
import { createTweetMintServer } from './index.js';
import { PUMP_PROGRAM, decodeBase58, verifyDeployment } from './coins.js';

const NOW = Date.parse('2026-10-12T06:00:00Z');
const source = { id: 'test-rss', family: 'google', name: 'Google News · Solana', type: 'rss', category: 'solana', interval: 600_000, enabled: true, feedUrl: 'https://news.google.com/rss/search?q=Solana' };
const rss = (title = 'Solana ecosystem coverage', date = 'Mon, 12 Oct 2026 05:00:00 GMT', link = 'https://news.google.com/rss/articles/real-provider-reference') =>
  `<rss version="2.0"><channel><title>Test search</title><item><title>${title} - Example Publisher</title><link>${link}</link><guid>provider-id</guid><pubDate>${date}</pubDate><source url="https://example.com">Example Publisher</source><description>&lt;a href="https://example.com"&gt;Do not copy full stories&lt;/a&gt;</description></item></channel></rss>`;
const record = (index, category = 'crypto', publisher = `Publisher ${index % 4}`) => ({
  id: contentId(`fixture:${index}`), providerKey: `fixture:${index}`, sourceKey: source.id,
  canonicalUrl: `https://example.com/story/${index}`, originalUrl: `https://example.com/story/${index}`,
  externalId: String(index), sourceName: publisher, sourceType: 'news', platform: 'News',
  headline: `Fixture headline ${index}`, summary: null, author: null, publishedAt: new Date(NOW - index * 60_000).toISOString(),
  discoveredAt: new Date(NOW).toISOString(), category, categories: category === 'solana' ? ['solana', 'crypto'] : [category],
  thumbnail: null, availability: 'available', editorialLabel: 'Published reporting',
});

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('source normalization', () => {
  it('keeps publication time, publisher, unresolved original URL, and no unauthorized body/images', () => {
    const [item] = parseRss(rss(), source, NOW);
    expect(item).toMatchObject({ headline: 'Solana ecosystem coverage', sourceName: 'Example Publisher',
      publishedAt: '2026-10-12T05:00:00.000Z', discoveredAt: '2026-10-12T06:00:00.000Z',
      summary: null, thumbnail: null, originalUrlResolved: false, availability: 'source-redirect', category: 'solana' });
    expect(item.originalUrl).toBe('https://news.google.com/rss/articles/real-provider-reference');
    expect(item.categories).toContain('crypto');
  });

  it('accepts Atom and RSS namespaces and labels explicit opinion cues honestly', () => {
    const xml = '<feed><title>Publisher</title><entry><id>atom:1</id><title>Opinion: Bitcoin debate</title><link rel="alternate" href="https://example.com/opinion"/><published>2026-10-12T03:00:00Z</published><author><name>Actual byline</name></author><summary>Supplied short summary.</summary></entry></feed>';
    const [item] = parseRss(xml, { ...source, family: 'publisher', name: 'Publisher', category: 'crypto' }, NOW);
    expect(item).toMatchObject({ sourceName: 'Publisher', summary: 'Supplied short summary.', author: { name: 'Actual byline' }, editorialLabel: 'Opinion' });
    expect(item.editorialLabelBasis).toContain('headline cues');
  });

  it('rejects bad XML, entities, non-feed HTML, missing/invalid/future timestamps and unrelated results', () => {
    expect(() => parseRss('<rss>', source, NOW)).toThrow();
    expect(() => parseRss('<!DOCTYPE x [<!ENTITY secret SYSTEM "file:///etc/passwd">]><rss/>', source, NOW)).toThrow();
    expect(() => parseRss('<html><body>No RSS</body></html>', source, NOW)).toThrow();
    expect(parseRss(rss('Solana story', 'not-a-date'), source, NOW)).toEqual([]);
    expect(parseRss(rss('Solana story', '2027-01-01T00:00:00Z'), source, NOW)).toEqual([]);
    expect(parseRss(rss('Unrelated sports result'), source, NOW)).toEqual([]);
    expect(canonicalUrl('javascript:alert(1)')).toBeNull();
    expect(canonicalUrl('https://example.com/story?utm_source=tracking&keep=1#fragment')).toBe('https://example.com/story?keep=1');
  });

  it('keeps Trump reporting as actual publisher-authored reporting', () => {
    const [item] = parseRss(rss('Trump statement reported', 'Mon, 12 Oct 2026 05:00:00 GMT'), { ...source, category: 'trump' }, NOW);
    expect(item.category).toBe('trump');
    expect(item.sourceName).toBe('Example Publisher');
    expect(item.author).toBeNull();
    expect(item.headline).toBe('Trump statement reported');
  });

  it('recognizes meme-related source coverage without inventing viral metrics', () => {
    const [item] = parseRss(rss('Viral gaming meme discussed'), { ...source, category: 'viral' }, NOW);
    expect(item.categories).toContain('viral');
    expect(item.externalEngagement).toBeUndefined();
    expect(item.thumbnail).toBeNull();
  });

  it('identifies Bluesky authors/posts correctly and ignores external engagement counters', () => {
    const json = { posts: [{ uri: 'at://did:plc:actual/app.bsky.feed.post/3realpost',
      author: { did: 'did:plc:actual', handle: 'actual.bsky.social', displayName: 'Actual public author' },
      record: { text: 'Solana public discussion', createdAt: '2026-10-12T05:00:00Z' }, likeCount: 9000,
      embed: { images: [{ thumb: 'https://example.com/unlicensed.jpg' }] } }] };
    const [item] = parseBluesky(json, { ...source, type: 'bluesky-search' }, NOW);
    expect(item).toMatchObject({ sourceType: 'bluesky', platform: 'Bluesky', sourceName: '@actual.bsky.social',
      originalUrl: 'https://bsky.app/profile/did%3Aplc%3Aactual/post/3realpost', thumbnail: null });
    expect(item.likeCount).toBeUndefined();
    expect(item.author.id).toBe('did:plc:actual');
    json.posts[0].author.did = 'did:plc:other';
    expect(parseBluesky(json, { ...source, type: 'bluesky-search' }, NOW)).toEqual([]);
  });

  it('creates honest X source-link cards, canonical provider IDs, and no fake public figure posts', () => {
    const item = xSourceItem('https://twitter.com/someuser/status/1234567890123456789?s=20', NOW);
    expect(item).toMatchObject({ externalId: '1234567890123456789', canonicalUrl: 'https://x.com/someuser/status/1234567890123456789',
      author: null, summary: null, publishedAt: null, category: 'social', availability: 'source-link' });
    expect(xSourceItem('https://x.com/i/web/status/1234567890123456789', NOW).id).toBe(item.id);
    expect(() => xSourceItem('https://x.com.evil.example/a/status/123')).toThrow();
    expect(() => xSourceItem('https://x.com/a/status/not-numeric')).toThrow();
  });

  it('properly encodes topic queries and requires rights opt-in for direct publishers', () => {
    const url = new URL(googleNewsUrl('Trump cryptocurrency & Solana'));
    expect(url.searchParams.get('q')).toBe('Trump cryptocurrency & Solana when:7d');
    expect(configuredSources({}).find((entry) => entry.id === 'decrypt').enabled).toBe(false);
    expect(configuredSources({ LICENSED_RSS_SOURCES: 'coindesk' }).find((entry) => entry.id === 'coindesk').enabled).toBe(true);
  });
});

describe('durable feed and discovery', () => {
  it('deduplicates canonical/provider IDs, merges categories, but preserves unrelated same-title reports', () => {
    const store = new FeedStore(':memory:');
    const first = record(1, 'solana'); store.insert(first);
    expect(store.insert({ ...record(2), canonicalUrl: first.canonicalUrl, categories: ['meme-coins'] })).toBeNull();
    expect(store.item(first.id).categories).toContain('meme-coins');
    const separate = { ...record(3), headline: first.headline, sourceName: first.sourceName };
    expect(store.insert(separate)).not.toBeNull();
    expect(store.records().length).toBe(2);
    expect(store.item(first.id).engagement.reactions.fire).toBe(0);
    store.db.close();
  });

  it('balances categories and publishers with deterministic seeds, stable pagination, and exact filter sorting', () => {
    const store = new FeedStore(':memory:'); store.configure([source]);
    const categories = ['crypto', 'viral', 'solana', 'meme-coins', 'trump', 'famous-people', 'technology'];
    const fixtures = Array.from({ length: 70 }, (_, index) => record(index, categories[index % categories.length]));
    fixtures.forEach((item) => store.insert(item));
    const shuffled = discoveryOrder(fixtures, 'visitor-seed', NOW);
    expect(new Set(shuffled.map((item) => item.id)).size).toBe(70);
    expect(shuffled.map((item) => item.id)).toEqual(discoveryOrder(fixtures, 'visitor-seed', NOW).map((item) => item.id));
    expect(shuffled.map((item) => item.id)).not.toEqual(discoveryOrder(fixtures, 'different', NOW).map((item) => item.id));
    expect(new Set(shuffled.slice(0, 12).map((item) => item.category)).size).toBeGreaterThanOrEqual(5);
    const page = buildFeed(store, new URLSearchParams('seed=visitor-seed&limit=9.5'), 'visitor', NOW);
    store.insert({ ...record(100), discoveredAt: new Date(NOW + 1).toISOString() });
    const next = buildFeed(store, new URLSearchParams({ seed: 'visitor-seed', limit: '9', cursor: page.nextCursor }), 'visitor', NOW + 2000);
    expect(new Set([...page.items, ...next.items].map((item) => item.id)).size).toBe(18);
    for (const category of ['crypto', 'solana', 'trump', 'viral']) {
      const filtered = buildFeed(store, new URLSearchParams({ category }), 'visitor', NOW);
      expect(filtered.items.every((item) => item.categories.includes(category))).toBe(true);
      expect(filtered.items.map((item) => item.publishedAt)).toEqual(filtered.items.map((item) => item.publishedAt).sort().reverse());
    }
    expect(() => buildFeed(store, new URLSearchParams('cursor=bad'), 'visitor', NOW)).toThrow('Invalid feed cursor');
    store.db.close();
  });

  it('persists visitor comments/shares/bookmarks and separately identifies fictional reactions', () => {
    const directory = mkdtempSync(join(tmpdir(), 'tweetmint-store-'));
    const path = join(directory, 'test.sqlite');
    let store = new FeedStore(path); const item = record(1); store.insert(item);
    const visitor = { id: 'visitor', name: 'Visitor test', type: 'visitor' };
    const fictional = { id: 'fictional-pixelmatt', name: 'Pixel Matt', type: 'fictional' };
    store.comment(item.id, visitor, 'My in-app comment', new Date(NOW).toISOString());
    store.engage(item.id, visitor, 'share', null, false); store.engage(item.id, visitor, 'share', null, false);
    store.engage(item.id, visitor, 'bookmark'); store.engage(item.id, fictional, 'reaction', 'fire', false);
    store.db.close(); store = new FeedStore(path);
    expect(store.comments(item.id)[0]).toMatchObject({ content: 'My in-app comment', actorType: 'visitor' });
    expect(store.item(item.id, visitor.id).engagement).toMatchObject({ bookmarked: true, shares: 1, comments: 1, reactions: { fire: 1 } });
    expect(store.db.prepare('SELECT actor_type FROM feed_engagement WHERE kind=?').get('reaction').actor_type).toBe('fictional');
    store.db.close(); rmSync(directory, { recursive: true });
  });

  it('caches honest source failures, schedules conditional fetches, and broadcasts only real new IDs', async () => {
    vi.useFakeTimers();
    const store = new FeedStore(':memory:'); store.configure([source]);
    let clock = NOW; const published = [];
    const fetcher = vi.fn(async () => new Response(rss(), { headers: { ETag: 'actual-etag' } }));
    const ingestion = createIngestion(store, { fetcher, publish: (message) => published.push(message), clock: () => clock });
    expect((await ingestion.run()).newItems).toBe(1);
    expect((await ingestion.run()).newItems).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(published.some((event) => event.activity?.type === 'news-comment')).toBe(true);
    expect(published.find((event) => event.activity?.type === 'news-react').activity).toMatchObject({ characterId: 'fictional-mooncat', category: 'solana' });
    expect(store.comments(store.records()[0].id)[0].actorType).toBe('fictional');
    expect(store.announcements()[0].itemId).toBe(store.records()[0].id);
    clock += 600_001;
    fetcher.mockImplementation(async () => new Response(null, { status: 304 }));
    expect((await ingestion.run()).newItems).toBe(0);
    expect(fetcher.mock.calls[1][1].headers['If-None-Match']).toBe('actual-etag');
    clock += 600_001;
    fetcher.mockImplementation(async () => new Response('Forbidden', { status: 403 }));
    await ingestion.run();
    expect(store.sources()[0].status).toBe('error');
    expect(Date.parse(store.sources()[0].nextFetchAt) - clock).toBeGreaterThanOrEqual(3_600_000);
    expect(store.records().length).toBe(1);
    expect(store.records()[0].publishedAt).toBe('2026-10-12T05:00:00.000Z');
    ingestion.stop(); store.db.close();
  });

  it('does not invent items or breaking news when sources fail or only old articles appear', async () => {
    const store = new FeedStore(':memory:'); store.configure([source]);
    const ingestion = createIngestion(store, { fetcher: async () => new Response('Not RSS', { status: 200 }), clock: () => NOW });
    await ingestion.run(); expect(store.records()).toEqual([]); expect(store.announcements()).toEqual([]);
    ingestion.stop(); store.db.close();
    const oldStore = new FeedStore(':memory:'); oldStore.configure([source]);
    const old = createIngestion(oldStore, { fetcher: async () => new Response(rss('Solana older coverage', 'Fri, 09 Oct 2026 06:00:00 GMT')), clock: () => NOW });
    await old.run(); expect(oldStore.records().length).toBe(1); expect(oldStore.announcements()).toEqual([]);
    old.stop(); oldStore.db.close();
  });
});

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const encode = (bytes) => {
  let number = BigInt(`0x${Buffer.from(bytes).toString('hex') || '0'}`), text = '';
  while (number) { text = BASE58[Number(number % 58n)] + text; number /= 58n; }
  let zeros = 0; while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  return '1'.repeat(zeros) + text;
};
function coinFixture() {
  const keys = generateKeyPairSync('ed25519');
  const creator = keys.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  const proposal = { sourceType: 'local-upload', sourceId: 'upload-1780000000000-abc123', sourceUrl: null,
    mintAddress: encode(Buffer.alloc(32, 7)), creatorWallet: encode(creator), signature: encode(Buffer.alloc(64, 8)),
    ticker: 'REAL', name: 'Prepared proposal', network: 'mainnet-beta', preparedAt: new Date(Date.now() - 60_000).toISOString() };
  const args = [proposal.name, proposal.ticker, 'https://example.com/metadata.json'].flatMap((text) => {
    const size = Buffer.alloc(4); size.writeUInt32LE(Buffer.byteLength(text)); return [size, Buffer.from(text)];
  });
  const data = encode(Buffer.concat([Buffer.from([24, 30, 200, 40, 5, 28, 7, 119]), ...args, creator]));
  const account = { owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', executable: false, data: { parsed: { type: 'mint', info: { isInitialized: true } } } };
  const transaction = { blockTime: Math.floor(Date.now() / 1000), meta: { err: null, innerInstructions: [{ instructions: [
    { programId: account.owner, parsed: { type: 'initializeMint2', info: { mint: proposal.mintAddress } } },
  ] }] }, transaction: { signatures: [proposal.signature], message: { accountKeys: [{ pubkey: proposal.creatorWallet, signer: true }], instructions: [
    { programId: PUMP_PROGRAM, data, accounts: [proposal.mintAddress, 'a', 'b', 'c', 'd', 'e', 'f', proposal.creatorWallet] },
  ] } } };
  return { keys, proposal, account, transaction };
}

describe('verified launch proof', () => {
  it('requires a recent successful creation, matching wallet signer, mint, Pump program, creator and metadata', () => {
    const { proposal, account, transaction } = coinFixture();
    expect(verifyDeployment(account, transaction, proposal)).toMatchObject({ verified: true, mintAddress: proposal.mintAddress, ticker: 'REAL' });
    const unsigned = structuredClone(transaction); unsigned.transaction.message.accountKeys[0].signer = false;
    expect(() => verifyDeployment(account, unsigned, proposal)).toThrow('did not sign');
    const transfer = structuredClone(transaction); transfer.transaction.message.instructions[0].programId = 'not-pump';
    expect(() => verifyDeployment(account, transfer, proposal)).toThrow('No pump.fun create');
    const old = structuredClone(transaction); old.blockTime -= 86_500;
    expect(() => verifyDeployment(account, old, proposal)).toThrow('predates');
    expect(() => verifyDeployment(account, transaction, { ...proposal, ticker: 'OTHER' })).toThrow('differs');
    expect(() => verifyDeployment({ ...account, data: { parsed: { type: 'account' } } }, transaction, proposal)).toThrow('initialized');
    expect(decodeBase58(encode(Buffer.alloc(32, 0))).length).toBe(32);
  });
});

describe('feed HTTP and WebSocket boundaries', () => {
  it('persists interaction mutations, validates origins and inputs, and sends cached scene cues without fabricated counts', async () => {
    const store = new FeedStore(':memory:'); const item = record(1); store.insert(item);
    const app = createTweetMintServer({ store, sources: [], ingest: false });
    app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
    const base = `http://127.0.0.1:${app.server.address().port}`;
    const session = await fetch(`${base}/api/feed/session`); const cookie = session.headers.get('set-cookie').split(';')[0];
    const post = (path, data, origin = 'http://localhost:5173') => fetch(`${base}${path}`, { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    try {
      expect((await post(`/api/feed/${item.id}/react`, { reaction: 'fake' })).status).toBe(400);
      expect((await post(`/api/feed/${item.id}/react`, { reaction: 'fire' }, 'https://other.example')).status).toBe(403);
      expect((await post(`/api/feed/${item.id}/comment`, { content: 'A visitor comment' })).status).toBe(200);
      await post(`/api/feed/${item.id}/react`, { reaction: 'fire' }); await post(`/api/feed/${item.id}/share`, {}); await post(`/api/feed/${item.id}/bookmark`, {});
      const details = await (await fetch(`${base}/api/feed/${item.id}`, { headers: { Cookie: cookie } })).json();
      expect(details.item.engagement).toMatchObject({ viewerReaction: 'fire', bookmarked: true, shares: 1, comments: 1 });
      expect(details.comments[0].actorType).toBe('visitor');
      const saved = await (await fetch(`${base}/api/feed?bookmarks=1`, { headers: { Cookie: cookie } })).json(); expect(saved.items.length).toBe(1);
      const x = await (await post('/api/feed/x', { url: 'https://x.com/test/status/1234567890123456789' })).json();
      expect(x.item.author).toBeNull(); expect(x.item.sourceType).toBe('x');
      const before = store.stats(); const socket = new WebSocket(`${base.replace('http:', 'ws:')}/api/feed/live`, { origin: 'http://localhost:5173' });
      const [message] = await once(socket, 'message'); const event = JSON.parse(message.toString());
      expect(event.activity).toMatchObject({ type: 'news-read', cached: true, content: 'Reading the original source.' });
      expect(store.stats()).toEqual(before); socket.close(); await once(socket, 'close');
    } finally { await new Promise((done) => app.server.close(done)); store.db.close(); }
  });

  it('binds launch ownership to one browser session, proposal and nonce and verifies before counting', async () => {
    const fixture = coinFixture();
    const fetcher = vi.fn(async (_url, options) => {
      const { method } = JSON.parse(options.body);
      return new Response(JSON.stringify({ result: method === 'getAccountInfo' ? { value: fixture.account } : fixture.transaction }), { headers: { 'Content-Type': 'application/json' } });
    });
    const store = new FeedStore(':memory:'); const app = createTweetMintServer({ store, sources: [], ingest: false, fetcher });
    app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
    const base = `http://127.0.0.1:${app.server.address().port}`;
    const session = await fetch(`${base}/api/feed/session`); const cookie = session.headers.get('set-cookie').split(';')[0];
    const other = await fetch(`${base}/api/feed/session`); const otherCookie = other.headers.get('set-cookie').split(';')[0];
    const post = (path, data, token = cookie) => fetch(`${base}${path}`, { method: 'POST', headers: { Cookie: token, Origin: 'http://localhost:5173', 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    try {
      const challengeResponse = await post('/api/coins/challenge', fixture.proposal); expect(challengeResponse.status).toBe(200);
      const challenge = await challengeResponse.json();
      const signed = { ...fixture.proposal, challengeId: challenge.challengeId, walletSignature: sign(null, Buffer.from(challenge.message), fixture.keys.privateKey).toString('base64') };
      expect((await post('/api/coins/verify', signed, otherCookie)).status).toBe(403);
      expect((await post('/api/coins/verify', { ...signed, ticker: 'CHANGED' })).status).toBe(403);
      expect((await post('/api/coins/verify', { ...signed, walletSignature: Buffer.alloc(64).toString('base64') })).status).toBe(403);
      expect(store.stats().verifiedCoins).toBe(0); expect(fetcher).not.toHaveBeenCalled();
      const verified = await post('/api/coins/verify', signed); expect(verified.status).toBe(200);
      expect((await verified.json()).verified).toBe(true); expect(store.stats().verifiedCoins).toBe(1);
      // Advance the rate-limit window as well as expiration, without interfering with native HTTP timers.
      const later = Date.now() + 360_000; vi.spyOn(Date, 'now').mockReturnValue(later);
      const expired = await post('/api/coins/challenge', fixture.proposal); const next = await expired.json();
      vi.mocked(Date.now).mockReturnValue(later + 360_000);
      expect((await post('/api/coins/verify', { ...signed, challengeId: next.challengeId })).status).toBe(403);
      expect(store.stats().verifiedCoins).toBe(1);
    } finally { await new Promise((done) => app.server.close(done)); store.db.close(); }
  });
});
