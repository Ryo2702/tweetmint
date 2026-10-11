import { create } from 'zustand';
import {
  connectWallet,
  disconnectWallet,
  getWalletOptions,
  subscribeWalletEvents,
  trySilentConnect,
  walletError
} from '../services/walletService.js';
import { fetchSolBalance, fetchSplTokenBalances, SOLANA_NETWORK } from '../services/solanaRpc.js';

const PROVIDER_PREFERENCE_KEY = 'tweetmint.wallet.provider';
let activeConnection = null;
let removeWalletEvents = null;
let balanceRequest = 0;

const initialState = {
  selectedProvider: null,
  status: 'disconnected',
  address: null,
  network: SOLANA_NETWORK,
  solBalance: null,
  splTokens: [],
  connectionError: null,
  connecting: false,
  disconnecting: false,
  balanceStatus: 'idle',
  balanceError: null,
  splTokenStatus: 'idle',
  splTokenError: null,
  walletOptions: [],
  walletReady: false
};

function rememberProvider(id) {
  try { window.localStorage.setItem(PROVIDER_PREFERENCE_KEY, id); } catch { /* preference is best effort */ }
}

function rememberedProvider() {
  try { return window.localStorage.getItem(PROVIDER_PREFERENCE_KEY); } catch { return null; }
}

function forgetProvider() {
  try { window.localStorage.removeItem(PROVIDER_PREFERENCE_KEY); } catch { /* preference is best effort */ }
}

function clearEventSubscription() {
  removeWalletEvents?.();
  removeWalletEvents = null;
}

function clearConnection(set, selectedProvider = null, status = 'disconnected', error = null) {
  clearEventSubscription();
  activeConnection = null;
  set({
    status,
    selectedProvider,
    address: null,
    solBalance: null,
    splTokens: [],
    connectionError: error,
    connecting: status === 'connecting',
    disconnecting: status === 'disconnecting',
    balanceStatus: 'idle',
    balanceError: null,
    splTokenStatus: 'idle',
    splTokenError: null,
    network: SOLANA_NETWORK
  });
}

function setConnected(connection, set, get) {
  clearEventSubscription();
  activeConnection = connection;
  set({
    selectedProvider: connection.id,
    status: 'connected',
    address: connection.address,
    network: connection.network,
    solBalance: null,
    splTokens: [],
    connectionError: null,
    connecting: false,
    disconnecting: false,
    balanceStatus: 'loading',
    balanceError: null,
    splTokenStatus: 'loading',
    splTokenError: null
  });
  const isActive = () => activeConnection?.id === connection.id && activeConnection?.wallet === connection.wallet && activeConnection?.provider === connection.provider;
  removeWalletEvents = subscribeWalletEvents(connection, {
    onAccountChanged: (address, account) => {
      if (!isActive()) return;
      activeConnection = { ...activeConnection, address, account };
      set({ address, solBalance: null, splTokens: [], balanceStatus: 'loading', balanceError: null, splTokenStatus: 'loading', splTokenError: null });
      get().refreshBalance();
    },
    onNetworkChanged: (network) => {
      if (isActive()) {
        set({ network });
        get().refreshBalance();
      }
    },
    onDisconnect: () => {
      if (isActive()) clearConnection(set, connection.id);
    }
  });
}

export const useWalletStore = create((set, get) => ({
  ...initialState,

  discover: () => {
    set({ walletOptions: getWalletOptions(), walletReady: true });
  },

  connect: async (providerId) => {
    if (get().status === 'connecting' || get().status === 'disconnecting') return null;
    const selectedProvider = String(providerId || '').toLowerCase();
    set({ status: 'connecting', selectedProvider, connecting: true, connectionError: null, balanceError: null });
    try {
      if (activeConnection && activeConnection.id !== selectedProvider) {
        const previousConnection = activeConnection;
        clearEventSubscription();
        activeConnection = null;
        await disconnectWallet(previousConnection);
      }
      const connection = await connectWallet(selectedProvider);
      rememberProvider(connection.id);
      setConnected(connection, set, get);
      await get().refreshBalance();
      return connection;
    } catch (error) {
      const normalized = walletError(error, selectedProvider);
      clearConnection(set, selectedProvider, 'error', normalized.message);
      return null;
    }
  },

  restore: async () => {
    get().discover();
    const providerId = rememberedProvider();
    if (!providerId) return null;
    set({ status: 'connecting', selectedProvider: providerId, connecting: true, connectionError: null });
    const connection = await trySilentConnect(providerId);
    if (!connection) {
      clearConnection(set, providerId);
      return null;
    }
    setConnected(connection, set, get);
    await get().refreshBalance();
    return connection;
  },

  disconnect: async () => {
    const connection = activeConnection;
    if (!connection || get().status === 'disconnecting') {
      forgetProvider();
      clearConnection(set, get().selectedProvider);
      return true;
    }
    set({ status: 'disconnecting', disconnecting: true, connectionError: null });
    try {
      await disconnectWallet(connection);
      forgetProvider();
      clearConnection(set, connection.id);
      return true;
    } catch (error) {
      forgetProvider();
      const normalized = walletError(error, connection.name);
      clearConnection(set, connection.id, 'error', normalized.message);
      return false;
    }
  },

  refreshBalance: async () => {
    const connection = activeConnection;
    if (!connection?.address) return null;
    const requestId = ++balanceRequest;
    set({ balanceStatus: 'loading', balanceError: null, splTokenStatus: 'loading', splTokenError: null });
    const [solResult, tokenResult] = await Promise.allSettled([
      fetchSolBalance(connection.address, { network: get().network }),
      fetchSplTokenBalances(connection.address, { network: get().network })
    ]);
    if (requestId !== balanceRequest || activeConnection !== connection) return null;
    const solError = solResult.status === 'rejected' ? solResult.reason : null;
    set({
      solBalance: solResult.status === 'fulfilled' ? solResult.value.sol : null,
      splTokens: tokenResult.status === 'fulfilled' ? tokenResult.value : [],
      balanceStatus: solError ? 'error' : 'ready',
      balanceError: solError ? String(solError.message || 'SOL balance unavailable.') : null,
      splTokenStatus: tokenResult.status === 'fulfilled' ? 'ready' : 'error',
      splTokenError: tokenResult.status === 'rejected' ? String(tokenResult.reason?.message || 'SPL token holdings unavailable.') : null
    });
    return solResult.status === 'fulfilled' ? solResult.value : null;
  }
}));

export function getWalletSnapshot() {
  return useWalletStore.getState();
}
