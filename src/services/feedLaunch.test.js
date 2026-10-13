import { describe, expect, it } from 'vitest';
import { createFeedLaunchSource } from './feedLaunch.js';

describe('feed-linked coin preparation', () => {
  it('keeps articles and Bluesky posts separate from numeric X identities', () => {
    const article = createFeedLaunchSource({ id: 'article-1', sourceType: 'news', originalUrl: 'https://example.com/story', externalId: 'publisher-123' });
    expect(article).toMatchObject({ postId: 'news-article-1', sourceType: 'news', sourceContentId: 'publisher-123', canonicalUrl: 'https://example.com/story' });
    const post = createFeedLaunchSource({ id: 'post-1', sourceType: 'bluesky', originalUrl: 'https://bsky.app/profile/person/post/123', externalId: 'at://person/app.bsky.feed.post/123' });
    expect(post.postId).toBe('bluesky-post-1');
    expect(post.sourceContentId).toBe('at://person/app.bsky.feed.post/123');
  });

  it('uses a real X status ID only for an original X source', () => {
    expect(createFeedLaunchSource({ id: 'x-item', sourceType: 'x', originalUrl: 'https://twitter.com/person/status/123456789' })).toMatchObject({ postId: '123456789', canonicalUrl: 'https://x.com/person/status/123456789' });
    expect(() => createFeedLaunchSource({ id: 'bad', sourceType: 'x', originalUrl: 'https://example.com/123' })).toThrow();
    expect(() => createFeedLaunchSource({ id: 'bad', sourceType: 'news', originalUrl: 'javascript:alert(1)' })).toThrow();
  });
});
