import { describe, expect, it } from 'vitest';
import { newsActivityBubble } from './PlazaScene.jsx';

describe('fictional character news reactions', () => {
  it('uses neutral category notices without quoting unsupported event content', () => {
    expect(newsActivityBubble({ type: 'news-read', category: 'trump', content: 'An invented political quote' })).toBe('New Trump story!');
    expect(newsActivityBubble({ type: 'news-read', category: 'solana' })).toBe('New Solana story!');
    expect(newsActivityBubble({ type: 'news-read', category: 'unknown' })).toBe('New source story!');
    expect(newsActivityBubble({ type: 'news-read', category: 'crypto', cached: true })).toBe('reading the source');
  });

  it('uses compact in-world reactions and source-oriented comments and shares', () => {
    expect(newsActivityBubble({ type: 'news-react', reactionType: 'skull', category: 'viral' })).toBe('💀');
    expect(newsActivityBubble({ type: 'news-react', category: 'viral' })).toBe('haha');
    expect(newsActivityBubble({ type: 'news-comment' })).toBe('checking the source');
    expect(newsActivityBubble({ type: 'news-share' })).toBe('↗ shared source');
    expect(newsActivityBubble({ type: 'post-created' })).toBe('');
    expect(newsActivityBubble(null)).toBe('');
  });
});
