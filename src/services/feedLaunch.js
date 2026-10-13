import { parseXPostUrl } from '../state/xUrl.js';

export function createFeedLaunchSource(item) {
  const url = new URL(item.originalUrl || item.canonicalUrl);
  if (url.protocol !== 'https:') throw new Error('A secure original source URL is required.');
  const x = item.sourceType === 'x' ? parseXPostUrl(url.href) : null;
  if (x && !x.ok) throw new Error('The source does not contain a valid X post ID.');
  if (!/^[A-Za-z0-9_-]+$/.test(item.id)) throw new Error('The feed source ID is invalid.');
  return {
    ...(x || {}),
    ok: true,
    postId: x?.postId || `${item.sourceType}-${item.id}`,
    canonicalUrl: x?.canonicalUrl || url.href,
    sourceType: item.sourceType,
    sourceContentId: item.externalId || item.id,
    feedItemId: item.id,
    sourceName: item.sourceName,
    author: item.author || null,
    publishedAt: item.publishedAt || null
  };
}
