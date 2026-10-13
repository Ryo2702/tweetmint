import { contentId } from './parse.js';

export function discoveryOrder(items, seed, now = Date.now()) {
  const targets = { crypto: 0.25, viral: 0.2, solana: 0.075, 'meme-coins': 0.075, trump: 0.15, 'famous-people': 0.15, technology: 0.1, social: 0.05 };
  const groups = new Map();
  for (const item of items) {
    const category = item.category;
    const random = (parseInt(contentId(`${seed}:${item.id}`).slice(0, 8), 16) + 1) / 0x100000001;
    const age = item.publishedAt ? Math.max(0, now - Date.parse(item.publishedAt)) / 86_400_000 : 3;
    const score = random * Math.exp(-age / 3);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push({ item, score });
  }
  for (const group of groups.values()) group.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
  const chosen = [], counts = {}, publishers = {};
  while (groups.size) {
    const category = [...groups.keys()].sort((a, b) =>
      ((counts[a] || 0) + 1) / (targets[a] || 0.1) - ((counts[b] || 0) + 1) / (targets[b] || 0.1))[0];
    const group = groups.get(category);
    const previous = chosen.at(-1)?.sourceName;
    const index = group.slice(0, 12).reduce((best, candidate, position, candidates) => {
      const cost = (entry) => (publishers[entry.item.sourceName] || 0) * 0.15 + (entry.item.sourceName === previous ? 1 : 0) - entry.score;
      return cost(candidate) < cost(candidates[best]) ? position : best;
    }, 0);
    const [{ item }] = group.splice(index, 1);
    chosen.push(item); counts[category] = (counts[category] || 0) + 1; publishers[item.sourceName] = (publishers[item.sourceName] || 0) + 1;
    if (!group.length) groups.delete(category);
  }
  return chosen;
}

export function buildFeed(store, params, actorId, now = Date.now()) {
  const category = params.get('category') || 'for-you';
  const allowed = ['for-you', 'latest', 'crypto', 'solana', 'meme-coins', 'trump', 'viral', 'famous-people'];
  if (!allowed.includes(category)) throw Object.assign(new Error('Unknown feed category.'), { status: 400 });
  const requestedSeed = (params.get('seed') || String(Math.floor(now / 300_000))).slice(0, 80);
  let cursor = { offset: 0, asOf: new Date(now).toISOString(), seed: requestedSeed, category };
  if (params.has('cursor')) {
    try {
      const decoded = JSON.parse(Buffer.from(params.get('cursor'), 'base64url').toString());
      if (decoded.category !== category || !Number.isInteger(decoded.offset) || decoded.offset < 0 || decoded.offset > 3000 ||
          !Number.isFinite(Date.parse(decoded.asOf)) || Date.parse(decoded.asOf) > now + 1000 || typeof decoded.seed !== 'string' || decoded.seed.length > 80) throw new Error();
      cursor = decoded;
    } catch { throw Object.assign(new Error('Invalid feed cursor.'), { status: 400 }); }
  }
  const limit = Math.floor(Math.max(1, Math.min(30, Number(params.get('limit')) || 18)));
  let items = store.records(cursor.asOf);
  if (category !== 'for-you' && category !== 'latest') items = items.filter((item) => item.categories.includes(category));
  if (params.get('bookmarks') === '1') {
    const bookmarks = store.bookmarked(actorId); items = items.filter((item) => bookmarks.has(item.id));
  }
  if (category === 'for-you') items = discoveryOrder(items, cursor.seed, Date.parse(cursor.asOf));
  else items.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '') || a.id.localeCompare(b.id));
  const selected = items.slice(cursor.offset, cursor.offset + limit).map((item) => store.decorate(item, actorId));
  const nextCursor = cursor.offset + limit < items.length ? Buffer.from(JSON.stringify({ ...cursor, offset: cursor.offset + limit })).toString('base64url') : null;
  return { items: selected, nextCursor, seed: cursor.seed, lastUpdated: store.lastUpdated(), sources: store.sources(), announcements: store.announcements() };
}
