import { describe, expect, it } from 'vitest';
import { buildPumpFunCoinUrl, buildPumpFunLaunchDraft, normalizeTicker } from './pumpFun.js';

describe('pump.fun launch preparation', () => {
  it('normalizes the user ticker and keeps the launch handoff explicit', () => {
    expect(normalizeTicker('$chair')).toBe('CHAIR');
    expect(buildPumpFunCoinUrl('MintAddress')).toBe('https://pump.fun/explore?outputCurrency=MintAddress');
    expect(buildPumpFunLaunchDraft({ source: { postId: '123' }, screenshot: { screenshotAssetId: 'asset-123' }, ticker: '$chair', name: 'Chair Coin', walletAddress: 'Wallet', network: 'mainnet-beta' })).toMatchObject({
      launchPlatform: 'pump.fun',
      sourcePostId: '123',
      screenshotAssetId: 'asset-123',
      ticker: 'CHAIR',
      creatorWallet: 'Wallet'
    });
  });
});

