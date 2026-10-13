import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewsFeed, { NewsCard } from './NewsFeed.jsx';

const story = {
  id: 'a', sourceType: 'bluesky', platform: 'Bluesky', sourceName: 'Actual source author',
  author: { name: 'Source Author', handle: 'source.bsky.social' }, headline: 'Source-provided text',
  originalUrl: 'https://bsky.app/profile/source.bsky.social/post/example', category: 'crypto',
  publishedAt: '2026-10-11T12:00:00Z', discoveredAt: '2026-10-12T14:00:00Z',
  engagement: { reactions: { fire: 2 }, comments: 1, shares: 3 }
};

function render(item, comments = [], expanded = false) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  client.setQueryData(['news', 'item', item.id], { item, comments });
  return renderToStaticMarkup(<QueryClientProvider client={client}><NewsCard item={item} initiallyExpanded={expanded} onMakeCoin={() => {}} /></QueryClientProvider>);
}

describe('real source cards', () => {
  it('offers the requested close control on the embedded discovery feed', () => {
    const client = new QueryClient();
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><NewsFeed embedded onClose={() => {}} /></QueryClientProvider>);
    expect(html).toContain('aria-label="Close NEWS &amp; VIRAL FEED"');
  });

  it('keeps platform, authorship, source URL and publication/discovery times distinct', () => {
    const html = render(story);
    expect(html).toContain('BLUESKY POST');
    expect(html).not.toContain('X POST');
    expect(html).toContain('Source Author');
    expect(html).toContain(`href="${story.originalUrl}"`);
    expect(html).toContain(`dateTime="${story.publishedAt}"`);
    expect(html).toContain(`dateTime="${story.discoveredAt}"`);
    expect(html).toContain('TWEETMINT REACTIONS');
    expect(html).toContain('MAKE IT A COIN');
  });

  it('identifies fictional comments and escapes source-supplied text', () => {
    const html = render({ ...story, summary: '<script>alert(1)</script>' }, [{
      id: 'c', actorName: 'Pixel Matt', actorType: 'fictional', content: 'Reading the source.', createdAt: story.discoveredAt
    }], true);
    expect(html).toContain('FICTIONAL CHARACTER');
    expect(html).toContain('not source reporting');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('requires a user action to load an official X embed while retaining the source link', () => {
    const item = { ...story, sourceType: 'x', platform: 'X', originalUrl: 'https://x.com/real_author/status/1234567890' };
    const html = render(item, [], true);
    expect(html).toContain('X POST');
    expect(html).toContain('Load official X embed');
    expect(html).toContain('Open Original Source');
    expect(html).not.toContain('platform.twitter.com/widgets.js');
  });
});
