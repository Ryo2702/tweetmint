import { describe, expect, it, vi } from 'vitest';
import { getWalletOptions, isSupportedStandardWallet, normalizeWalletConnection, signWalletMessage, walletError } from './walletService.js';

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

  it('signs the exact ownership challenge through Wallet Standard', async () => {
    const signature = Uint8Array.from({ length: 64 }, (_, index) => index);
    const account = { address: 'public-address' };
    const signMessage = vi.fn(async ({ message }) => [{ signedMessage: message, signature, signatureType: 'ed25519' }]);
    const connection = { kind: 'standard', name: 'Phantom', address: account.address, account, wallet: { features: { 'solana:signMessage': { signMessage } } } };
    expect(await signWalletMessage(connection, 'TweetMint ownership challenge')).toBe(btoa(String.fromCharCode(...signature)));
    expect(signMessage).toHaveBeenCalledExactlyOnceWith({ account, message: new TextEncoder().encode('TweetMint ownership challenge') });
  });

  it.each(['object', 'bytes'])('supports legacy %s message signatures', async (format) => {
    const signature = new Uint8Array(64).fill(9);
    const signMessage = vi.fn(async () => format === 'object' ? { signature } : signature);
    const connection = { kind: 'legacy', name: 'Solflare', address: 'public-address', provider: { signMessage } };
    expect(await signWalletMessage(connection, 'Source-linked proposal')).toBe(btoa(String.fromCharCode(...signature)));
    expect(signMessage).toHaveBeenCalledExactlyOnceWith(new TextEncoder().encode('Source-linked proposal'), 'utf8');
  });

  it('rejects unsupported signing and altered message bytes', async () => {
    await expect(signWalletMessage(null, 'challenge')).rejects.toMatchObject({ code: 'not-connected' });
    await expect(signWalletMessage({ kind: 'legacy', address: 'public-address', provider: {} }, 'challenge')).rejects.toMatchObject({ code: 'unsupported' });
    const account = { address: 'public-address' };
    const connection = { kind: 'standard', address: account.address, account, wallet: { features: {
      'solana:signMessage': { signMessage: async () => [{ signedMessage: new TextEncoder().encode('changed challenge'), signature: new Uint8Array(64) }] }
    } } };
    await expect(signWalletMessage(connection, 'challenge')).rejects.toMatchObject({ code: 'changed-message' });
  });

  it('reports rejected signing approval without changing connection errors', async () => {
    const connection = { kind: 'legacy', name: 'Phantom', address: 'public-address', provider: { signMessage: async () => { throw { code: 4001 }; } } };
    await expect(signWalletMessage(connection, 'challenge')).rejects.toMatchObject({ code: 'user-rejected', message: 'Phantom message signing was rejected.' });
  });
});
