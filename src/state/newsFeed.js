export const NEWS_CATEGORIES = [
  ['for-you', 'FOR YOU'], ['latest', 'LATEST'], ['crypto', 'CRYPTO'], ['solana', 'SOLANA'],
  ['meme-coins', 'MEME COINS'], ['trump', 'TRUMP'], ['viral', 'VIRAL'], ['famous-people', 'FAMOUS PEOPLE']
];

export const SOURCE_LABELS = {
  news: 'NEWS ARTICLE', x: 'X POST', bluesky: 'BLUESKY POST', meme: 'MEME', 'crypto-discovery': 'CRYPTO DISCOVERY'
};

export function safeSourceUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function uniqueFeedItems(pages = []) {
  const seen = new Set();
  return pages.flatMap((page) => page.items || []).filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function formatNewsTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.valueOf())) return 'Not supplied';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date);
}
