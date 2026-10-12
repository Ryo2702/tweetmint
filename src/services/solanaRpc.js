const env = import.meta.env || {};

export const SOLANA_NETWORK = String(env.VITE_SOLANA_NETWORK || 'mainnet-beta');
const PUBLIC_RPC_URLS = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com'
};
// shortcut: the public RPC can rate-limit, set VITE_SOLANA_RPC_URL for production traffic.
export const SOLANA_RPC_URL = String(env.VITE_SOLANA_RPC_URL || PUBLIC_RPC_URLS[SOLANA_NETWORK] || PUBLIC_RPC_URLS['mainnet-beta']);
export const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

export function normalizeNetwork(value = SOLANA_NETWORK) {
  const network = String(value || '').toLowerCase();
  if (network.includes('devnet')) return 'devnet';
  if (network.includes('testnet')) return 'testnet';
  return 'mainnet-beta';
}

export function networkLabel(value = SOLANA_NETWORK) {
  const network = normalizeNetwork(value);
  return network === 'mainnet-beta' ? 'MAINNET' : network.toUpperCase();
}

export function getExplorerUrl(address, network = SOLANA_NETWORK) {
  const suffix = normalizeNetwork(network) === 'mainnet-beta' ? '' : `?cluster=${normalizeNetwork(network)}`;
  return `https://explorer.solana.com/address/${encodeURIComponent(address)}${suffix}`;
}

export function getRpcUrl(network = SOLANA_NETWORK) {
  return env.VITE_SOLANA_RPC_URL ? SOLANA_RPC_URL : PUBLIC_RPC_URLS[normalizeNetwork(network)] || SOLANA_RPC_URL;
}

export async function rpcRequest(method, params = [], options = {}) {
  const response = await fetch(options.rpcUrl || getRpcUrl(options.network), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params })
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Solana RPC returned an unreadable response (${response.status}).`);
  }
  if (!response.ok || payload?.error) {
    const error = new Error(payload?.error?.message || `Solana RPC request failed (${response.status}).`);
    error.code = payload?.error?.code || `http-${response.status}`;
    throw error;
  }
  return payload?.result;
}

export async function fetchSolBalance(address, options = {}) {
  if (!address) throw new Error('A wallet address is required to fetch SOL balance.');
  const result = await rpcRequest('getBalance', [address, { commitment: 'confirmed' }], options);
  const lamports = Number(result?.value);
  if (!Number.isFinite(lamports)) throw new Error('Solana RPC did not return a valid SOL balance.');
  return { lamports, sol: lamports / 1_000_000_000 };
}

export async function fetchSplTokenBalances(address, options = {}) {
  if (!address) throw new Error('A wallet address is required to fetch SPL tokens.');
  const result = await rpcRequest('getTokenAccountsByOwner', [
    address,
    { programId: TOKEN_PROGRAM_ID },
    { encoding: 'jsonParsed', commitment: 'confirmed' }
  ], options);
  // shortcut: mint addresses are shown until a verified token metadata registry is configured.
  return (result?.value || []).map((entry) => {
    const info = entry?.account?.data?.parsed?.info;
    const amount = info?.tokenAmount;
    return {
      mint: String(info?.mint || ''),
      amount: String(amount?.amount || '0'),
      decimals: Number(amount?.decimals || 0),
      uiAmount: Number(amount?.uiAmount ?? amount?.uiAmountString ?? 0)
    };
  }).filter((token) => token.mint && token.amount !== '0');
}

export async function verifySolanaMint(address, options = {}) {
  const mintAddress = String(address || '').trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mintAddress)) {
    throw new Error('Enter a valid Solana mint address.');
  }
  const result = await rpcRequest('getAccountInfo', [mintAddress, { encoding: 'jsonParsed', commitment: 'confirmed' }], options);
  const account = result?.value;
  if (!account) return { confirmed: false, reason: 'missing-account', mintAddress };
  const owner = String(account.owner || '');
  if (owner !== TOKEN_PROGRAM_ID) {
    return { confirmed: false, reason: 'not-token-mint', mintAddress, owner };
  }
  return { confirmed: true, mintAddress, owner };
}
