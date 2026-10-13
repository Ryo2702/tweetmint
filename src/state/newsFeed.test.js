import { describe, expect, it } from 'vitest';
import { formatNewsTime, safeSourceUrl, uniqueFeedItems } from './newsFeed.js';

describe('news feed presentation boundaries', () => {
  it('accepts real web URLs and rejects executable source links', () => {
    expect(safeSourceUrl('https://example.org/story?x=1')).toBe('https://example.org/story?x=1');
    expect(safeSourceUrl('javascript:alert(1)')).toBeNull();
    expect(safeSourceUrl('data:text/html,test')).toBeNull();
    expect(safeSourceUrl('/not-an-original-url')).toBeNull();
  });

  it('renders overlapping pages once without dropping different source records', () => {
    const a = { id: 'a', headline: 'Shared headline' };
    const b = { id: 'b', headline: 'Shared headline' };
    expect(uniqueFeedItems([{ items: [a] }, { items: [a, b, null] }])).toEqual([a, b]);
  });

  it('never invents a publication timestamp for missing or invalid metadata', () => {
    expect(formatNewsTime(null)).toBe('Not supplied');
    expect(formatNewsTime('invalid')).toBe('Not supplied');
    expect(formatNewsTime('2026-10-12T05:00:00Z')).not.toBe('Not supplied');
  });
});
