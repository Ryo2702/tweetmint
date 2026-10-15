import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import NewsFeed, { SOURCE_LINKS } from './NewsFeed.jsx';
import App from '../App.jsx';
import { CRYPTO_NEWS, CRYPTO_NEWS_UPDATED } from '../data/cryptoNews.js';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe('hyperlink-only integrations', () => {
  it('renders source links and the close control without a query provider', () => {
    const html = renderToStaticMarkup(<NewsFeed embedded onClose={() => {}} />);
    expect(html).toContain('aria-label="Close CRYPTO NEWS &amp; LINKS"');
    for (const [, url] of SOURCE_LINKS) expect(html).toContain(`href="${url}"`);
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('shows dated crypto stories as source links and labels the manual snapshot', () => {
    const html = renderToStaticMarkup(<NewsFeed />);
    expect(CRYPTO_NEWS.length).toBeGreaterThan(0);
    expect(html).toContain('Manually updated');
    expect(html).toContain(`dateTime="${CRYPTO_NEWS_UPDATED}"`);
    for (const story of CRYPTO_NEWS) {
      expect(new URL(story.url).protocol).toBe('https:');
      expect(html).toContain(`href="${story.url}"`);
      expect(html).toContain(`dateTime="${story.publishedAt}"`);
      expect(Date.parse(story.publishedAt)).toBeLessThanOrEqual(Date.parse(CRYPTO_NEWS_UPDATED));
    }
  });

  it('renders the app without contacting services', () => {
    const fetch = vi.fn(() => { throw new Error('Unexpected request'); });
    vi.stubGlobal('fetch', fetch);
    try {
      const html = renderToStaticMarkup(<App />);
      expect(html).toContain('Wallet links');
      expect(fetch).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });

  it('contains no application API clients or external embed loaders', () => {
    function check(directory) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) check(path);
        else if (/\.[jt]sx?$/.test(path) && !path.includes('.test.')) {
          expect(readFileSync(path, 'utf8'), path).not.toMatch(/\bfetch\s*\(|\bnew\s+(?:WebSocket|XMLHttpRequest|EventSource)\b|\/api\/|platform\.twitter\.com|solana:signMessage/);
        }
      }
    }
    check('src');
  });
});
