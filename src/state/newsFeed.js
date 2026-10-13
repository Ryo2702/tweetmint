import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

export async function newsRequest(path, options = {}) {
  const response = await fetch(`/api/feed${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  let result;
  try { result = await response.json(); } catch { throw new Error('News service returned an unreadable response.'); }
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'The news service is temporarily unavailable.');
  return result;
}

let sessionRequest;
function ensureSession() {
  if (!sessionRequest) sessionRequest = newsRequest('/session').catch((error) => { sessionRequest = null; throw error; });
  return sessionRequest;
}

export async function requestNewsRefresh() {
  await ensureSession();
  return newsRequest('/refresh', { method: 'POST', body: '{}' });
}

export function useNewsFeed(category) {
  const [seed] = useState(() => Math.random().toString(36).slice(2));
  return useInfiniteQuery({
    queryKey: ['news', 'feed', category, category === 'for-you' ? seed : 'ordered'],
    initialPageParam: '',
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ category: category === 'bookmarks' ? 'latest' : category });
      if (category === 'bookmarks') params.set('bookmarks', '1');
      if (category === 'for-you') params.set('seed', seed);
      if (pageParam) params.set('cursor', pageParam);
      return newsRequest(`?${params}`, { signal });
    },
    // shortcut: render at most five pages, add virtualization if browsing deeper becomes necessary.
    getNextPageParam: (page, pages) => pages.length < 5 ? page.nextCursor || undefined : undefined,
    staleTime: 60_000
  });
}

export function useNewsAction(itemId) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, ...body }) => {
      await ensureSession();
      return newsRequest(`/${encodeURIComponent(itemId)}/${action}`, { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: (result) => {
      if (result.item) client.setQueryData(['news', 'item', itemId], (old) => ({ ...old, ...result }));
      client.invalidateQueries({ queryKey: ['news'] });
    }
  });
}

export function useNewsLive(onActivity) {
  const client = useQueryClient();
  const callback = useRef(onActivity);
  const [connection, setConnection] = useState('connecting');
  useEffect(() => { callback.current = onActivity; }, [onActivity]);

  useEffect(() => {
    let closed = false;
    let socket;
    let retryTimer;
    let attempts = 0;
    const connect = async () => {
      try {
        await ensureSession();
        if (closed) return;
        const url = new URL('/api/feed/live', window.location.href);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        const nextSocket = new WebSocket(url);
        socket = nextSocket;
        nextSocket.onopen = () => { attempts = 0; setConnection('connected'); client.invalidateQueries({ queryKey: ['news'] }); };
        nextSocket.onmessage = (event) => {
          if (closed) return;
          let message;
          try { message = JSON.parse(event.data); } catch { return; }
          if (['feed-update', 'engagement-update', 'source-update', 'coin-confirmed'].includes(message.type)) client.invalidateQueries({ queryKey: ['news'] });
          for (const activity of Array.isArray(message.activity) ? message.activity : message.activity ? [message.activity] : []) callback.current?.(activity);
        };
        nextSocket.onclose = reconnect;
        nextSocket.onerror = () => nextSocket.close();
      } catch { reconnect(); }
    };
    const reconnect = () => {
      if (closed) return;
      setConnection('reconnecting');
      retryTimer = window.setTimeout(connect, Math.min(60_000, 1000 * 2 ** Math.min(attempts++, 6)));
    };
    connect();
    return () => {
      closed = true;
      window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [client]);
  return connection;
}
