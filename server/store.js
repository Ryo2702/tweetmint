import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { REACTION_TYPES } from '../src/data/community.js';
import { contentId } from './parse.js';

export class FeedStore {
  constructor(path = 'server/data/tweetmint.sqlite') {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS news_sources(id TEXT PRIMARY KEY, config TEXT NOT NULL, state TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS feed_items(id TEXT PRIMARY KEY, provider_key TEXT UNIQUE NOT NULL, canonical_url TEXT UNIQUE NOT NULL,
        source_name TEXT NOT NULL, headline_key TEXT NOT NULL, published_at TEXT, discovered_at TEXT NOT NULL, record TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS feed_published ON feed_items(published_at DESC);
      CREATE INDEX IF NOT EXISTS feed_discovered ON feed_items(discovered_at);
      CREATE TABLE IF NOT EXISTS feed_sessions(id TEXT PRIMARY KEY, expires_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS feed_engagement(id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES feed_items(id),
        actor_id TEXT NOT NULL, actor_name TEXT NOT NULL, actor_type TEXT NOT NULL, kind TEXT NOT NULL,
        content TEXT, created_at TEXT NOT NULL, UNIQUE(item_id,actor_id,kind));
      CREATE INDEX IF NOT EXISTS engagement_item ON feed_engagement(item_id);
      CREATE TABLE IF NOT EXISTS feed_comments(id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES feed_items(id),
        actor_id TEXT NOT NULL, actor_name TEXT NOT NULL, actor_type TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS comments_item ON feed_comments(item_id,created_at);
      CREATE TABLE IF NOT EXISTS feed_announcements(id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES feed_items(id),
        type TEXT NOT NULL, title TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(item_id,type));
      CREATE TABLE IF NOT EXISTS verified_coins(source_id TEXT PRIMARY KEY, item_id TEXT REFERENCES feed_items(id),
        mint_address TEXT UNIQUE NOT NULL, signature TEXT UNIQUE NOT NULL, record TEXT NOT NULL, confirmed_at TEXT NOT NULL);`);
  }

  configure(sources) {
    for (const source of sources) {
      const old = this.db.prepare('SELECT state FROM news_sources WHERE id=?').get(source.id);
      const state = old ? JSON.parse(old.state) : { status: source.enabled ? 'pending' : 'disabled', failures: 0, nextFetchAt: null, lastSuccessAt: null };
      if (!source.enabled) Object.assign(state, { status: 'disabled', error: source.disabledReason });
      else if (state.status === 'disabled') Object.assign(state, { status: 'pending', error: null, nextFetchAt: null });
      this.db.prepare('INSERT INTO news_sources VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET config=excluded.config,state=excluded.state')
        .run(source.id, JSON.stringify(source), JSON.stringify(state));
    }
  }

  sources() {
    return this.db.prepare('SELECT * FROM news_sources').all().map((row) => ({ ...JSON.parse(row.config), ...JSON.parse(row.state) }));
  }

  sourceState(id, state) {
    this.db.prepare('UPDATE news_sources SET state=? WHERE id=?').run(JSON.stringify(state), id);
  }

  insert(item) {
    const headlineKey = item.headline.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    const existing = this.db.prepare('SELECT * FROM feed_items WHERE provider_key=? OR canonical_url=? OR (source_name=? AND headline_key=? AND published_at=? AND published_at IS NOT NULL) LIMIT 1')
      .get(item.providerKey, item.canonicalUrl, item.sourceName, headlineKey, item.publishedAt);
    if (existing) {
      const record = JSON.parse(existing.record);
      record.categories = [...new Set([...record.categories, ...item.categories])];
      this.db.prepare('UPDATE feed_items SET record=? WHERE id=?').run(JSON.stringify(record), existing.id);
      return null;
    }
    this.db.prepare('INSERT INTO feed_items VALUES (?,?,?,?,?,?,?,?)').run(item.id, item.providerKey, item.canonicalUrl,
      item.sourceName, headlineKey, item.publishedAt, item.discoveredAt, JSON.stringify(item));
    return item;
  }

  records(asOf = new Date().toISOString()) {
    // shortcut: rank the latest 3,000 cached records in memory; move ranking to SQL when the active window exceeds this.
    return this.db.prepare('SELECT record FROM feed_items WHERE discovered_at<=? ORDER BY published_at DESC, id LIMIT 3000')
      .all(asOf).map((row) => JSON.parse(row.record));
  }

  item(id, actorId) {
    const row = this.db.prepare('SELECT record FROM feed_items WHERE id=?').get(id);
    return row ? this.decorate(JSON.parse(row.record), actorId) : null;
  }

  decorate(item, actorId) {
    const reactions = Object.fromEntries(REACTION_TYPES.map((type) => [type, 0]));
    const activity = this.db.prepare('SELECT kind,content,COUNT(*) AS count FROM feed_engagement WHERE item_id=? GROUP BY kind,content').all(item.id);
    for (const entry of activity) if (entry.kind === 'reaction' && entry.content in reactions) reactions[entry.content] += entry.count;
    const own = actorId ? this.db.prepare('SELECT kind,content FROM feed_engagement WHERE item_id=? AND actor_id=?').all(item.id, actorId) : [];
    const count = this.db.prepare('SELECT COUNT(*) AS count FROM feed_comments WHERE item_id=?').get(item.id).count;
    const { providerKey, sourceKey, ...record } = item;
    return { ...record, engagement: { reactions, comments: count,
      shares: activity.filter((entry) => entry.kind === 'share').reduce((sum, entry) => sum + entry.count, 0),
      viewerReaction: own.find((entry) => entry.kind === 'reaction')?.content || null,
      bookmarked: own.some((entry) => entry.kind === 'bookmark') } };
  }

  comments(id, limit = 100) {
    return this.db.prepare('SELECT id, actor_name AS actorName, actor_type AS actorType, content, created_at AS createdAt FROM feed_comments WHERE item_id=? ORDER BY created_at DESC LIMIT ?')
      .all(id, limit).reverse();
  }

  engage(itemId, actor, kind, content = null, toggle = true, now = new Date().toISOString()) {
    const existing = this.db.prepare('SELECT * FROM feed_engagement WHERE item_id=? AND actor_id=? AND kind=?').get(itemId, actor.id, kind);
    if (toggle && existing && (kind === 'bookmark' || existing.content === content)) {
      this.db.prepare('DELETE FROM feed_engagement WHERE id=?').run(existing.id);
      return false;
    }
    this.db.prepare('INSERT INTO feed_engagement VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(item_id,actor_id,kind) DO UPDATE SET content=excluded.content,created_at=excluded.created_at')
      .run(contentId(`${itemId}:${actor.id}:${kind}`), itemId, actor.id, actor.name, actor.type, kind, content, now);
    return true;
  }

  comment(itemId, actor, content, now = new Date().toISOString()) {
    const comment = { id: randomBytes(12).toString('hex'), actorName: actor.name, actorType: actor.type, content, createdAt: now };
    this.db.prepare('INSERT INTO feed_comments VALUES (?,?,?,?,?,?,?)').run(comment.id, itemId, actor.id, actor.name, actor.type, content, now);
    return comment;
  }

  bookmarked(actorId) {
    return new Set(this.db.prepare("SELECT item_id FROM feed_engagement WHERE actor_id=? AND kind='bookmark'").all(actorId).map((row) => row.item_id));
  }

  announcement(item, type, title, now = new Date().toISOString()) {
    const announcement = { id: contentId(`${item.id}:${type}`), itemId: item.id, type, title, createdAt: now };
    this.db.prepare('INSERT OR IGNORE INTO feed_announcements VALUES (?,?,?,?,?)').run(announcement.id, item.id, type, title, now);
    return announcement;
  }

  announcements() {
    return this.db.prepare('SELECT id,item_id AS itemId,type,title,created_at AS createdAt FROM feed_announcements ORDER BY created_at DESC LIMIT 30').all();
  }

  session(cookie) {
    const now = new Date().toISOString();
    this.db.prepare('DELETE FROM feed_sessions WHERE expires_at<=?').run(now);
    if (cookie && /^[a-f0-9]{48}$/.test(cookie) && this.db.prepare('SELECT id FROM feed_sessions WHERE id=? AND expires_at>?').get(cookie, now)) return { id: cookie, isNew: false };
    const id = randomBytes(24).toString('hex');
    this.db.prepare('INSERT INTO feed_sessions VALUES (?,?)').run(id, new Date(Date.now() + 30 * 86_400_000).toISOString());
    return { id, isNew: true };
  }

  lastUpdated() {
    return this.sources().map((source) => source.lastSuccessAt).filter(Boolean).sort().at(-1) || null;
  }

  stats(now = Date.now()) {
    const day = new Date(now); day.setUTCHours(0, 0, 0, 0);
    const since = day.toISOString();
    const items = this.db.prepare('SELECT record FROM feed_items WHERE discovered_at>=?').all(since).map((row) => JSON.parse(row.record));
    return { articlesToday: items.filter((item) => item.sourceType === 'news').length,
      cryptoToday: items.filter((item) => item.categories.includes('crypto')).length,
      solanaToday: items.filter((item) => item.categories.includes('solana')).length,
      viralToday: items.filter((item) => item.categories.includes('viral')).length,
      commentsToday: this.db.prepare('SELECT COUNT(*) AS count FROM feed_comments WHERE created_at>=?').get(since).count,
      reactionsToday: this.db.prepare("SELECT COUNT(*) AS count FROM feed_engagement WHERE kind='reaction' AND created_at>=?").get(since).count,
      verifiedCoins: this.db.prepare('SELECT COUNT(*) AS count FROM verified_coins').get().count,
      lastUpdated: this.lastUpdated(), dayBoundary: 'UTC', engagementScope: 'TweetMint visitors and fictional plaza characters' };
  }

  recordCoin(sourceId, itemId, proof) {
    const existing = this.db.prepare('SELECT record FROM verified_coins WHERE source_id=? OR mint_address=? OR signature=?').get(sourceId, proof.mintAddress, proof.signature);
    if (existing) {
      const old = JSON.parse(existing.record);
      if (old.sourceId !== sourceId || old.mintAddress !== proof.mintAddress || old.signature !== proof.signature) throw new Error('This source, mint, or transaction already has a different recorded launch.');
      return old;
    }
    const record = { ...proof, sourceId, itemId: itemId || null };
    this.db.prepare('INSERT INTO verified_coins VALUES (?,?,?,?,?,?)').run(sourceId, itemId || null, proof.mintAddress, proof.signature, JSON.stringify(record), proof.confirmedAt);
    return record;
  }
}
