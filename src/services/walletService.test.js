import { describe, expect, it } from 'vitest';
import { getWalletOptions, isSupportedStandardWallet, normalizeWalletConnection, walletError } from './walletService.js';

describe('walletService', () => {
  it('accepts only Phantom and Solflare Solana Standard wallets', () => {
    expect(isSupportedStandardWallet({ name: 'Phantom', chains: ['solana:mainnet'], features: {} })).toBe(true);
    expect(isSupportedStandardWallet({ name: 'Solflare', chains: ['solana:devnet'], features: {} })).toBe(true);
    expect(isSupportedStandardWallet({ name: 'MetaMask', chains: ['eip155:1'], features: {} })).toBe(false);
    expect(isSupportedStandardWallet({ name: 'Phantom', chains: ['eip155:1'], features: {} })).toBe(false);
  });

  it('detects only the two supported injected extension providers', () => {
    const previousWindow = globalThis.window;
    globalThis.window = {
      phantom: { solana: { connect: () => Promise.resolve() } },
      solflare: { connect: () => Promise.resolve() },
      addEventListener: () => {},
      dispatchEvent: () => true
    };
    try {
      expect(getWalletOptions().map((wallet) => [wallet.name, wallet.installed])).toEqual([['Phantom', true], ['Solflare', true]]);
    } finally {
      globalThis.window = previousWindow;
    }
  });

  it('keeps the provider public address as a string and does not sign during connect', () => {
    const option = { id: 'phantom', name: 'Phantom', kind: 'standard', wallet: { chains: ['solana:devnet'] }, provider: null };
    expect(normalizeWalletConnection(option, { accounts: [{ address: '7xKpAddress' }] })).toMatchObject({ address: '7xKpAddress', network: 'devnet' });
  });

  it('classifies rejected extension approval clearly', () => {
    expect(walletError({ code: 4001 }, 'Phantom').code).toBe('user-rejected');
    expect(walletError(new Error('request timed out'), 'Solflare').code).toBe('timeout');
  });
});
