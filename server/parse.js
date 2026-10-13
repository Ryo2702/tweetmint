import { createHash } from 'node:crypto';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { classify, CATEGORY_PATTERNS } from './sources.js';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', parseTagValue: false, trimValues: true });
const list = (value) => value == null ? [] : Array.isArray(value) ? value : [value];
const value = (text) => typeof text === 'object' ? text?.['#text'] || '' : String(text ?? '');
export const contentId = (text) => createHash('sha256').update(text).digest('hex').slice(0, 24);

export function plainText(text, length = 500) {
  return value(text).replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|amp|lt|gt|quot|apos);/g, (entity) =>
    ({ '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" })[entity])
    .replace(/\s+/g, ' ').trim().slice(0, length);
}

export function canonicalUrl(input) {
  try {
    const url = new URL(input);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|mc_|ref$)/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    return url.href;
  } catch { return null; }
}

function timestamp(input, now) {
  const millis = Date.parse(input);
  return Number.isFinite(millis) && millis <= now + 5 * 60_000 ? new Date(millis).toISOString() : null;
}

function editorialLabel(title, tags = '') {
  if (/\b(satire|parody)\b/i.test(`${tags} ${title}`)) return 'Satire / parody';
  if (/\b(opinion|editorial|op-ed)\b/i.test(`${tags} ${title}`)) return 'Opinion';
  if (/\b(alleged|unverified|rumou?r|claims?|reportedly)\b/i.test(title)) return 'Reported claim — check original source';
  return 'Published reporting — check original source';
}

export function parseRss(xml, source, now = Date.now()) {
  if (xml.length > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('Invalid or oversized RSS/Atom XML');
  const parsed = parser.parse(xml);
  const channel = parsed.rss?.channel || parsed.feed;
  if (!channel) throw new Error('Response is not an RSS or Atom feed');
  const records = list(channel.item || channel.entry).slice(0, 150);
  const items = [];
  for (const record of records) {
    const headline = plainText(record.title, 350);
    const link = list(record.link).find((entry) => typeof entry === 'string' || entry?.['@rel'] === 'alternate' || !entry?.['@rel']);
    const originalUrl = canonicalUrl(typeof link === 'object' ? link?.['@href'] : link);
    const publishedAt = timestamp(value(record.pubDate || record.published || record.updated || record['dc:date']), now);
    if (!headline || !originalUrl || !publishedAt) continue;
    const suppliedCategories = list(record.category).map(value).join(' ');
    if (source.family === 'google' && CATEGORY_PATTERNS[source.category] && !CATEGORY_PATTERNS[source.category].test(headline)) continue;
    const publisher = plainText(source.family === 'google' ? record.source || source.name : source.name, 120);
    const cleanHeadline = source.family === 'google' && headline.endsWith(` - ${publisher}`) ? headline.slice(0, -(publisher.length + 3)) : headline;
    const externalId = plainText(record.guid || record.id || originalUrl, 1500);
    const categories = classify(`${cleanHeadline} ${suppliedCategories}`, source.category);
    const byline = plainText(record['dc:creator'] || record.author?.name || record.author, 120);
    const unresolved = new URL(originalUrl).hostname === 'news.google.com';
    items.push({ id: contentId(`${source.family}:${externalId}`), sourceKey: source.id, providerKey: `${source.family}:${externalId}`,
      externalId, headline: cleanHeadline, sourceName: publisher, sourceType: 'news', platform: 'News',
      originalUrl, canonicalUrl: originalUrl, originalUrlResolved: !unresolved, publishedAt,
      discoveredAt: new Date(now).toISOString(), ...categories, author: byline ? { name: byline } : null,
      // Google descriptions are link lists; publisher feeds never grant permission to copy full article bodies.
      summary: source.family === 'google' ? null : plainText(record.description || record.summary, 220) || null,
      thumbnail: null, availability: unresolved ? 'source-redirect' : 'available', editorialLabel: editorialLabel(cleanHeadline, suppliedCategories),
      editorialLabelBasis: 'Feed tags and headline cues; read the publisher for context.' });
  }
  return items;
}

export function parseBluesky(json, source, now = Date.now()) {
  const records = source.type === 'bluesky-author' ? json.feed?.map((entry) => entry.post) : json.posts;
  if (!Array.isArray(records)) throw new Error('Invalid Bluesky AppView response');
  return records.flatMap((post) => {
    const match = /^at:\/\/(did:[^/]+)\/app\.bsky\.feed\.post\/([a-zA-Z0-9]+)$/.exec(post.uri || '');
    const text = plainText(post.record?.text, 240);
    const publishedAt = timestamp(post.record?.createdAt, now);
    if (!match || !text || !publishedAt || !post.author?.handle || post.author.did !== match[1]) return [];
    if (post.labels?.some((label) => ['porn', 'sexual', 'graphic-media', '!hide', '!warn'].includes(label.val))) return [];
    const url = `https://bsky.app/profile/${encodeURIComponent(match[1])}/post/${match[2]}`;
    return [{ id: contentId(`bluesky:${post.uri}`), sourceKey: source.id, providerKey: `bluesky:${post.uri}`, externalId: post.uri,
      headline: text, summary: null, sourceType: 'bluesky', sourceName: `@${post.author.handle}`, platform: 'Bluesky',
      canonicalUrl: url, originalUrl: url, originalUrlResolved: true, publishedAt, discoveredAt: new Date(now).toISOString(),
      ...classify(text, source.category), author: { name: plainText(post.author.displayName || post.author.handle, 120), handle: post.author.handle, id: post.author.did },
      thumbnail: null, availability: 'available', editorialLabel: 'Public social post — author claims' }];
  });
}

export function xSourceItem(input, now = Date.now()) {
  const url = canonicalUrl(input);
  if (!url) throw new Error('Enter a valid public X post URL.');
  const parsed = new URL(url);
  const match = /^\/(?:([a-zA-Z0-9_]{1,15})\/status|i\/(?:web\/)?status)\/(\d{1,25})\/?$/.exec(parsed.pathname);
  if (!['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(parsed.hostname) || !match) throw new Error('Enter an x.com or twitter.com status URL.');
  const handle = match[1] || null;
  const canonical = `https://x.com/${handle || 'i'}/status/${match[2]}`;
  return { id: contentId(`x:${match[2]}`), sourceKey: 'user-x', providerKey: `x:${match[2]}`, externalId: match[2],
    sourceName: 'X · visitor-submitted link', sourceType: 'x', platform: 'X', canonicalUrl: canonical, originalUrl: canonical,
    originalUrlResolved: true, headline: `X source link submitted${handle ? ` · route @${handle}` : ''}`,
    summary: null, author: null, submittedHandle: handle, publishedAt: null,
    discoveredAt: new Date(now).toISOString(), category: 'social', categories: ['social'],
    thumbnail: null, availability: 'source-link', editorialLabel: 'Submitted source link — post availability unverified' };
}
