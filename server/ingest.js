import { fictionalCharacters } from '../src/data/community.js';
import { contentId, parseBluesky, parseRss } from './parse.js';

export function createIngestion(store, { fetcher = fetch, publish = () => {}, clock = Date.now } = {}) {
  let running = null, timer = null;
  const activityTimers = new Set();

  async function fetchSource(source) {
    const start = clock();
    const prior = { status: source.status, failures: source.failures || 0, lastSuccessAt: source.lastSuccessAt || null,
      etag: source.etag, lastModified: source.lastModified };
    const headers = { 'User-Agent': 'TweetMint/1.0 (public-feed metadata reader)', Accept: source.type === 'rss' ? 'application/rss+xml, application/atom+xml, application/xml, text/xml' : 'application/json' };
    if (source.etag) headers['If-None-Match'] = source.etag;
    if (source.lastModified) headers['If-Modified-Since'] = source.lastModified;
    try {
      const response = await fetcher(source.feedUrl, { headers, signal: AbortSignal.timeout(12_000), redirect: 'follow' });
      if (response.status === 304) {
        store.sourceState(source.id, { ...prior, status: 'ready', failures: 0, error: null, lastAttemptAt: new Date(start).toISOString(),
          lastSuccessAt: new Date(start).toISOString(), nextFetchAt: new Date(start + source.interval).toISOString() });
        return [];
      }
      if (!response.ok) {
        const error = new Error(`Source returned HTTP ${response.status}${response.status === 403 ? ' (public access unavailable; no authentication bypass)' : ''}`);
        const retryHeader = response.headers.get('retry-after');
        const retry = Number(retryHeader) * 1000 || Math.max(0, Date.parse(retryHeader) - start) || 0;
        error.retryAfter = Math.min(86_400_000, Math.max(retry, response.status === 403 ? 3_600_000 : 0));
        throw error;
      }
      if (Number(response.headers.get('content-length')) > 2_000_000) throw new Error('Source response exceeds the metadata limit');
      const reader = response.body.getReader();
      const chunks = []; let bytes = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 2_000_000) { await reader.cancel(); throw new Error('Source response exceeds the metadata limit'); }
        chunks.push(chunk.value);
      }
      const text = Buffer.concat(chunks).toString('utf8');
      const records = source.type === 'rss' ? parseRss(text, source, start) : parseBluesky(JSON.parse(text), source, start);
      const inserted = [];
      for (const record of records) {
        if (Date.parse(record.publishedAt) < start - 14 * 86_400_000) continue;
        const item = store.insert(record);
        if (item) inserted.push(item);
      }
      store.sourceState(source.id, { status: 'ready', failures: 0, error: null, lastSuccessAt: new Date(start).toISOString(),
        lastAttemptAt: new Date(start).toISOString(), nextFetchAt: new Date(start + source.interval).toISOString(),
        etag: response.headers.get('etag'), lastModified: response.headers.get('last-modified') });
      return inserted;
    } catch (error) {
      const failures = prior.failures + 1;
      const backoff = Math.max(source.interval, Math.min(3_600_000, 60_000 * 2 ** Math.min(failures, 6)), error.retryAfter || 0);
      store.sourceState(source.id, { ...prior, failures, status: 'error', error: String(error.message).slice(0, 220),
        lastAttemptAt: new Date(start).toISOString(), nextFetchAt: new Date(start + backoff).toISOString() });
      return [];
    }
  }

  function communityActivity(item, index) {
    const cast = [fictionalCharacters[(index * 3) % fictionalCharacters.length], fictionalCharacters[(index * 3 + 1) % fictionalCharacters.length], fictionalCharacters[(index * 3 + 2) % fictionalCharacters.length]];
    const label = ({ solana: 'Solana coverage', crypto: 'crypto coverage', trump: 'a published political story', viral: 'a meme story', 'meme-coins': 'meme coin coverage' })[item.category] || 'a new source post';
    const comment = item.category === 'trump' ? 'I’m opening the original reporting before discussing this.' : item.categories.includes('crypto') ? 'Reading the original source. A headline is not investment advice.' : 'I want to read the original source before sharing my take.';
    const actions = [
      { type: 'news-read', character: cast[0], content: `New ${label}!` },
      { type: 'news-react', character: cast[1], content: item.category === 'viral' ? '😂' : '👀', reactionType: item.category === 'viral' ? 'laugh' : 'shocked' },
      { type: 'news-comment', character: cast[2], content: comment },
      { type: 'news-share', character: cast[0], content: 'Sharing the source on the board.' },
    ];
    actions.forEach((action, step) => {
      const handle = setTimeout(() => {
        activityTimers.delete(handle);
        const actor = { id: action.character.id, name: action.character.displayName, type: 'fictional' };
        const now = new Date(clock()).toISOString();
        if (action.type === 'news-react') store.engage(item.id, actor, 'reaction', action.reactionType, false, now);
        if (action.type === 'news-comment') store.comment(item.id, actor, action.content, now);
        if (action.type === 'news-share') store.engage(item.id, actor, 'share', null, false, now);
        publish({ type: 'feed-update', itemIds: [], activity: { id: contentId(`${item.id}:${actor.id}:${action.type}:${now}`),
          characterId: actor.id, type: action.type, category: item.category,
          itemId: item.id, content: action.content, reactionType: action.reactionType, createdAt: now } });
        if (step) publish({ type: 'engagement-update', itemId: item.id });
      }, index * 6000 + step * 1500);
      handle.unref(); activityTimers.add(handle);
    });
  }

  async function run() {
    if (running) return running;
    running = (async () => {
      const sources = store.sources().filter((source) => source.enabled && (!source.nextFetchAt || Date.parse(source.nextFetchAt) <= clock()));
      const inserted = [];
      // Fetch centrally in small batches, never once per browser or in an uncontrolled loop.
      for (let index = 0; index < sources.length; index += 3) {
        const results = await Promise.allSettled(sources.slice(index, index + 3).map(fetchSource));
        for (const result of results) if (result.status === 'fulfilled') inserted.push(...result.value);
      }
      inserted.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      let announcement = null;
      const fresh = inserted.find((item) => clock() - Date.parse(item.publishedAt) <= 2 * 3_600_000);
      if (fresh) {
        const labels = { solana: ['SOLANA UPDATE', 'New Solana ecosystem coverage published'], crypto: ['CRYPTO ALERT', 'New cryptocurrency coverage published'],
          viral: ['MEME DISCOVERY', 'New meme and internet culture coverage discovered'], 'meme-coins': ['MEME COIN WATCH', 'New meme coin coverage discovered'] };
        const [type, title] = labels[fresh.category] || ['SOURCE UPDATE', 'New published source content discovered'];
        announcement = store.announcement(fresh, type, title, new Date(clock()).toISOString());
      }
      if (inserted.length) {
        publish({ type: 'feed-update', itemIds: inserted.slice(0, 100).map((item) => item.id), announcement });
        inserted.slice(0, 3).forEach(communityActivity);
      }
      return { newItems: inserted.length, lastUpdated: store.lastUpdated(), sources: store.sources() };
    })().finally(() => { running = null; });
    return running;
  }

  return { run, start() { run(); timer = setInterval(run, 30_000); timer.unref(); },
    stop() { clearInterval(timer); for (const handle of activityTimers) clearTimeout(handle); activityTimers.clear(); return running || Promise.resolve(); } };
}
