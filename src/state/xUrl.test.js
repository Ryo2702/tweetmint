import { describe, expect, it } from 'vitest';
import { parseXPostUrl, validateXUrl } from './xUrl.js';

describe('X post URL parsing', () => {
  it.each([
    ['https://x.com/username/status/1234567890123456789', 'https://x.com/username/status/1234567890123456789'],
    ['https://twitter.com/username/status/1234567890123456789', 'https://x.com/username/status/1234567890123456789'],
    ['https://www.x.com/username/status/1234567890123456789?utm_source=test', 'https://x.com/username/status/1234567890123456789'],
    ['https://mobile.twitter.com/username/status/1234567890123456789/photo/1#media', 'https://x.com/username/status/1234567890123456789'],
    ['https://x.com/i/status/1234567890123456789', 'https://x.com/i/status/1234567890123456789'],
    ['https://x.com/i/web/status/1234567890123456789', 'https://x.com/i/web/status/1234567890123456789'],
  ])('accepts %s', (value, canonicalUrl) => {
    const parsed = parseXPostUrl(value);
    expect(parsed).toMatchObject({ ok: true, postId: '1234567890123456789' });
    expect(parsed.canonicalUrl).toBe(canonicalUrl);
  });

  it('keeps i routes canonical and IDs as strings', () => {
    expect(parseXPostUrl(' https://x.com/i/web/status/9223372036854775807 ')).toEqual({
      ok: true,
      postId: '9223372036854775807',
      canonicalUrl: 'https://x.com/i/web/status/9223372036854775807',
    });
  });

  it.each([
    ['https://example.com/username/status/123', 'unsupported-domain'],
    ['https://x.com/username', 'missing-post-id'],
    ['https://x.com/search?q=status/123', 'missing-post-id'],
    ['https://x.com/username/status/not-a-number', 'missing-post-id'],
    ['not a URL', 'invalid-url'],
  ])('rejects %s', (value, reason) => {
    expect(parseXPostUrl(value)).toEqual({ ok: false, reason });
    expect(validateXUrl(value)).toBeNull();
  });
});
