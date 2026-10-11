import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSolBalance, fetchSplTokenBalances, getExplorerUrl, rpcRequest } from './solanaRpc.js';

afterEach(() => vi.unstubAllGlobals());

describe('solanaRpc', () => {
  it('converts confirmed lamports to an actual SOL balance', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ result: { value: 1234567890 } }) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchSolBalance('WalletAddress', { rpcUrl: 'https://rpc.example' })).resolves.toEqual({ lamports: 1234567890, sol: 1.23456789 });
    expect(fetchMock).toHaveBeenCalledWith('https://rpc.example', expect.objectContaining({ method: 'POST' }));
  });

  it('returns only non-zero parsed SPL holdings', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: { value: [
        { account: { data: { parsed: { info: { mint: 'MintOne', tokenAmount: { amount: '2500', decimals: 2, uiAmount: 25 } } } } } },
        { account: { data: { parsed: { info: { mint: 'MintZero', tokenAmount: { amount: '0', decimals: 6, uiAmount: 0 } } } } } }
      ] } })
    }));

    await expect(fetchSplTokenBalances('WalletAddress', { rpcUrl: 'https://rpc.example' })).resolves.toEqual([
      { mint: 'MintOne', amount: '2500', decimals: 2, uiAmount: 25 }
    ]);
  });

  it('surfaces JSON-RPC errors instead of fabricating a balance', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ error: { code: -32000, message: 'rate limited' } }) }));
    await expect(rpcRequest('getBalance', ['WalletAddress'], { rpcUrl: 'https://rpc.example' })).rejects.toThrow('rate limited');
  });

  it('uses the active Solana cluster in explorer links', () => {
    expect(getExplorerUrl('MintAddress', 'devnet')).toBe('https://explorer.solana.com/address/MintAddress?cluster=devnet');
  });
});
