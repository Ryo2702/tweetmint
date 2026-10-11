import { SOLANA_NETWORK, normalizeNetwork } from './solanaRpc.js';

export const WALLET_PROVIDERS = Object.freeze([
  { id: 'phantom', name: 'Phantom', installUrl: 'https://phantom.com/download' },
  { id: 'solflare', name: 'Solflare', installUrl: 'https://solflare.com/' }
]);

const standardWallets = new Map();
const discoverySubscribers = new Set();
let discoveryStarted = false;
const CONNECTION_TIMEOUT_MS = 60_000;

function waitForConnection(request, providerName) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new WalletError(`${providerName} connection timed out or was interrupted.`, 'timeout')), CONNECTION_TIMEOUT_MS);
    Promise.resolve(request).then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

export class WalletError extends Error {
  constructor(message, code = 'wallet-error', cause) {
    super(message);
    this.name = 'WalletError';
    this.code = code;
    this.cause = cause;
  }
}

export function supportedWalletId(value) {
  const id = String(value || '').toLowerCase();
  return WALLET_PROVIDERS.some((wallet) => wallet.id === id) ? id : null;
}

export function walletDisplayName(value) {
  const id = supportedWalletId(value);
  return WALLET_PROVIDERS.find((wallet) => wallet.id === id)?.name || String(value || 'Wallet');
}

export function isSupportedStandardWallet(wallet) {
  const id = supportedWalletId(wallet?.name);
  if (!id) return false;
  const chains = Array.isArray(wallet?.chains) ? wallet.chains : [];
  const features = Object.keys(wallet?.features || {});
  return chains.some((chain) => String(chain).startsWith('solana:')) || features.some((feature) => feature.startsWith('solana:'));
}

function browserWindow() {
  return typeof window === 'undefined' ? null : window;
}

function legacyProvider(id) {
  const target = browserWindow();
  if (!target) return null;
  const provider = id === 'phantom'
    ? target.phantom?.solana || (target.solana?.isPhantom ? target.solana : null)
    : id === 'solflare' ? target.solflare : null;
  return typeof provider?.connect === 'function' ? provider : null;
}

function registerWallet(wallet) {
  if (!isSupportedStandardWallet(wallet)) return;
  const id = supportedWalletId(wallet.name);
  if (standardWallets.get(id) !== wallet) {
    standardWallets.set(id, wallet);
    discoverySubscribers.forEach((listener) => listener(getWalletOptions()));
  }
}

function registerWallets(value) {
  if (Array.isArray(value)) value.forEach(registerWallet);
  else if (value && typeof value[Symbol.iterator] === 'function' && typeof value !== 'string') [...value].forEach(registerWallet);
  else registerWallet(value);
}

function ensureDiscovery() {
  if (discoveryStarted) return;
  const target = browserWindow();
  if (!target?.addEventListener) return;
  discoveryStarted = true;
  const onRegister = (event) => {
    if (typeof event.detail === 'function') event.detail({ register: registerWallets });
    else if (event.detail?.register) event.detail.register(registerWallets);
  };
  const onLegacyReady = () => discoverySubscribers.forEach((listener) => listener(getWalletOptions()));
  target.addEventListener('wallet-standard:register-wallet', onRegister);
  target.addEventListener('phantom#initialized', onLegacyReady);
  target.addEventListener('solflare#initialized', onLegacyReady);
  try {
    target.dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: { register: registerWallets } }));
  } catch {
    // Older browsers without CustomEvent still support the injected legacy providers.
  }
  onLegacyReady();
}

export function subscribeWalletDiscovery(listener) {
  ensureDiscovery();
  if (typeof listener !== 'function') return () => {};
  discoverySubscribers.add(listener);
  listener(getWalletOptions());
  return () => discoverySubscribers.delete(listener);
}

export function getWalletOptions() {
  ensureDiscovery();
  return WALLET_PROVIDERS.map((meta) => {
    const discovered = standardWallets.get(meta.id) || null;
    const wallet = discovered?.features?.['standard:connect']?.connect ? discovered : null;
    const provider = wallet ? null : legacyProvider(meta.id);
    return {
      ...meta,
      installed: Boolean(wallet || provider || discovered),
      kind: wallet ? 'standard' : provider ? 'legacy' : discovered ? 'standard' : null,
      wallet,
      provider,
      icon: (wallet || discovered)?.icon || null
    };
  });
}

export function findSupportedWallet(id) {
  return getWalletOptions().find((wallet) => wallet.id === supportedWalletId(id)) || null;
}

function addressFromAccount(account) {
  if (!account) return '';
  if (typeof account === 'string') return account;
  return String(account.address || account.publicKey || '');
}

function networkFromConnection(connection, account) {
  const chain = account?.chains?.[0] || connection?.wallet?.chains?.[0] || connection?.provider?.network || SOLANA_NETWORK;
  return normalizeNetwork(String(chain).split(':').pop());
}

export function normalizeWalletConnection(option, result = {}) {
  const account = result.accounts?.[0] || option.wallet?.accounts?.[0] || (result.publicKey ? { address: result.publicKey } : null);
  const address = addressFromAccount(account) || addressFromAccount(result.publicKey) || addressFromAccount(option.provider?.publicKey);
  if (!address) throw new WalletError(`${option.name} did not return a public wallet address.`, 'missing-address');
  return {
    id: option.id,
    name: option.name,
    kind: option.kind,
    wallet: option.wallet,
    provider: option.provider,
    account,
    address,
    network: networkFromConnection({ wallet: option.wallet, provider: option.provider }, account),
    icon: option.icon || null
  };
}

export function walletError(error, providerName = 'Wallet') {
  if (error instanceof WalletError) return error;
  const message = String(error?.message || error || 'Unknown wallet error');
  if (String(error?.code) === '4001' || /reject|denied|cancel/i.test(message)) return new WalletError(`${providerName} connection was rejected.`, 'user-rejected', error);
  if (/timeout|timed out|interrupted/i.test(message)) return new WalletError(`${providerName} connection timed out or was interrupted.`, 'timeout', error);
  return new WalletError(`${providerName} connection failed.`, 'connection-failed', error);
}

export async function connectWallet(id, { silent = false } = {}) {
  const option = findSupportedWallet(id);
  if (!option?.installed) throw new WalletError(`${walletDisplayName(id)} is not installed.`, 'unavailable');
  try {
    let request;
    if (option.kind === 'standard') {
      const feature = option.wallet?.features?.['standard:connect'];
      if (!feature?.connect) throw new WalletError(`${option.name} does not expose a Solana connection feature.`, 'unsupported');
      request = feature.connect({ silent: Boolean(silent) });
    } else {
      request = silent ? option.provider.connect({ onlyIfTrusted: true }) : option.provider.connect();
    }
    const result = await waitForConnection(request, option.name);
    return normalizeWalletConnection(option, result);
  } catch (error) {
    throw walletError(error, option.name);
  }
}

export async function trySilentConnect(id) {
  try {
    return await connectWallet(id, { silent: true });
  } catch {
    return null;
  }
}

export async function disconnectWallet(connection) {
  if (!connection) return;
  try {
    if (connection.kind === 'standard') await connection.wallet?.features?.['standard:disconnect']?.disconnect();
    else await connection.provider?.disconnect?.();
  } catch (error) {
    throw walletError(error, connection.name);
  }
}

function subscribeLegacy(provider, eventName, callback, cleanup) {
  if (!provider?.on) return;
  provider.on(eventName, callback);
  cleanup.push(() => provider.off?.(eventName, callback) || provider.removeListener?.(eventName, callback));
}

export function subscribeWalletEvents(connection, { onAccountChanged, onDisconnect, onNetworkChanged } = {}) {
  const cleanup = [];
  if (!connection) return () => {};
  if (connection.kind === 'standard') {
    const events = connection.wallet?.features?.['standard:events'];
    if (events?.on) {
      const handleChange = (change = {}) => {
        const account = change.accounts?.[0];
        const address = addressFromAccount(account);
        if (address) onAccountChanged?.(address, account);
        else if (change.accounts) onDisconnect?.();
        const chain = change.chains?.[0] || account?.chains?.[0];
        if (chain) onNetworkChanged?.(normalizeNetwork(String(chain).split(':').pop()));
      };
      const unsubscribe = events.on(handleChange);
      if (typeof unsubscribe === 'function') cleanup.push(unsubscribe);
      else if (events.off) cleanup.push(() => events.off(handleChange));
    }
  } else {
    subscribeLegacy(connection.provider, 'accountChanged', (publicKey) => {
      const address = addressFromAccount(publicKey) || addressFromAccount(connection.provider?.publicKey);
      if (address) onAccountChanged?.(address);
      else onDisconnect?.();
    }, cleanup);
    subscribeLegacy(connection.provider, 'disconnect', () => onDisconnect?.(), cleanup);
    subscribeLegacy(connection.provider, 'chainChanged', (chain) => onNetworkChanged?.(normalizeNetwork(String(chain).split(':').pop())), cleanup);
  }
  return () => cleanup.splice(0).forEach((remove) => remove());
}
