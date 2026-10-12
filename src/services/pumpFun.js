const env = import.meta.env || {};

export const PUMPFUN_CREATE_URL = String(env.VITE_PUMPFUN_CREATE_URL || 'https://pump.fun/create');

export function normalizeTicker(value) {
  return String(value || '').trim().replace(/^\$/, '').toUpperCase();
}

export function buildPumpFunLaunchUrl() {
  return PUMPFUN_CREATE_URL;
}

export function buildPumpFunCoinUrl(mintAddress) {
  const mint = String(mintAddress || '').trim();
  return mint ? `https://pump.fun/explore?outputCurrency=${encodeURIComponent(mint)}` : null;
}

export function buildPumpFunLaunchDraft({ source, screenshot, ticker, name, walletAddress, network }) {
  return {
    launchPlatform: 'pump.fun',
    sourcePostId: String(source?.postId || screenshot?.sourcePostId || ''),
    sourcePostUrl: source?.canonicalUrl || screenshot?.sourcePostUrl || null,
    screenshotAssetId: screenshot?.screenshotAssetId || null,
    screenshotUrl: screenshot?.screenshotUrl || null,
    ticker: normalizeTicker(ticker),
    name: String(name || '').trim(),
    creatorWallet: walletAddress || null,
    network: network || 'mainnet-beta',
    preparedAt: new Date().toISOString(),
  };
}

