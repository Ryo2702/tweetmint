export const CATEGORIES = [
  { id: 'for-you', label: 'FOR YOU' }, { id: 'latest', label: 'LATEST' },
  { id: 'crypto', label: 'CRYPTO' }, { id: 'solana', label: 'SOLANA' },
  { id: 'meme-coins', label: 'MEME COINS' }, { id: 'trump', label: 'TRUMP' },
  { id: 'viral', label: 'VIRAL' }, { id: 'famous-people', label: 'FAMOUS PEOPLE' },
];

export const CATEGORY_PATTERNS = {
  'meme-coins': /\b(meme.?coins?|memecoins?|pump\.fun|dogecoin|shiba inu|bonk|pepe token)\b/i,
  solana: /\b(solana|SOL token|jupiter exchange|phantom wallet|solflare)\b/i,
  trump: /\b(trump|white house|truth social)\b/i,
  viral: /\b(memes?|viral|internet culture|gaming|tiktok|trending joke)\b/i,
  'famous-people': /\b(trump|elon musk|vitalik buterin|celebrity|celebrities)\b/i,
  crypto: /\b(crypto(?:currency)?|bitcoin|ethereum|blockchain|web3|token|stablecoins?|solana|pump\.fun|memecoins?|meme coins?)\b/i,
  technology: /\b(technology|software|platform|app|artificial intelligence|AI|launch|announc|bluesky)\b/i,
};

export function classify(text, fallback) {
  const categories = Object.entries(CATEGORY_PATTERNS).filter(([, pattern]) => pattern.test(text)).map(([id]) => id);
  if (fallback && !categories.includes(fallback)) categories.push(fallback);
  return { category: categories[0] || 'technology', categories: categories.length ? categories : ['technology'] };
}

export function googleNewsUrl(query) {
  const url = new URL('https://news.google.com/rss/search');
  url.search = new URLSearchParams({ q: `${query} when:7d`, hl: 'en-US', gl: 'US', ceid: 'US:en' });
  return url.href;
}

export function configuredSources(env = process.env) {
  const topics = [
    ['trump', 'Donald Trump', 'trump'], ['trump-crypto', 'Trump cryptocurrency', 'trump'],
    ['crypto', 'cryptocurrency news', 'crypto'], ['solana', 'Solana ecosystem', 'solana'],
    ['meme-coins', 'new meme coins', 'meme-coins'], ['pumpfun', 'pump.fun', 'meme-coins'],
    ['platforms', 'new crypto platform application', 'technology'],
    ['viral', 'viral internet meme', 'viral'], ['gaming', 'gaming meme viral', 'viral'],
    ['musk', 'Elon Musk', 'famous-people'], ['vitalik', 'Vitalik Buterin', 'famous-people'],
    ['tech', 'technology announcement launch', 'technology'], ['regulation', 'crypto regulation', 'crypto'],
  ];
  const sources = topics.map(([id, query, category]) => ({
    id: `google-${id}`, family: 'google', name: `Google News · ${query}`, type: 'rss',
    feedUrl: googleNewsUrl(query), category, interval: 10 * 60_000, enabled: true,
    rights: 'Headlines and attribution only; no article body or images.',
  }));
  // Direct publisher redistribution is opt-in; an accessible RSS feed is not a content license.
  for (const [id, name, feedUrl, terms] of [
    ['coindesk', 'CoinDesk', 'https://www.coindesk.com/arc/outboundfeeds/rss/', 'https://www.coindesk.com/terms'],
    ['cointelegraph', 'Cointelegraph', 'https://cointelegraph.com/rss', 'https://cointelegraph.com/terms-and-conditions'],
    ['decrypt', 'Decrypt', 'https://decrypt.co/feed', 'https://decrypt.co/terms-of-service'],
  ]) {
    const enabled = (env.LICENSED_RSS_SOURCES || '').split(',').map((value) => value.trim()).includes(id);
    sources.push({ id, family: id, name, type: 'rss', feedUrl, category: 'crypto', interval: 15 * 60_000,
      enabled, terms, rights: 'Publisher permission required; metadata and short supplied excerpts only.',
      disabledReason: enabled ? null : 'Publisher redistribution permission has not been configured.' });
  }
  for (const [id, query, category] of [['crypto', 'crypto', 'crypto'], ['memes', 'meme', 'viral'], ['solana', 'Solana', 'solana']]) {
    const url = new URL('https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts');
    url.search = new URLSearchParams({ q: query, sort: 'latest', limit: '25', lang: 'en' });
    sources.push({ id: `bluesky-${id}`, family: 'bluesky', name: `Bluesky · ${query}`, type: 'bluesky-search',
      feedUrl: url.href, category, interval: 15 * 60_000, enabled: true, rights: 'Attributed public post excerpts; no copied media.' });
  }
  sources.push({ id: 'bluesky-official', family: 'bluesky', name: 'Bluesky official public posts', type: 'bluesky-author',
    feedUrl: 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=bsky.app&limit=25&filter=posts_no_replies',
    category: 'technology', interval: 15 * 60_000, enabled: true, rights: 'Attributed public post excerpts; no copied media.' });
  return sources;
}
