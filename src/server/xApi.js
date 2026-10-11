const DEFAULT_X_API_BASE_URL = 'https://api.x.com/2/tweets';

const TWEET_QUERY = {
  'tweet.fields': 'created_at,public_metrics,author_id,attachments,entities',
  expansions: 'author_id,attachments.media_keys',
  'user.fields': 'name,username,profile_image_url',
  'media.fields': 'url,preview_image_url,type,alt_text'
};

export function buildXTweetUrl(postId, apiBaseUrl = DEFAULT_X_API_BASE_URL) {
  const id = String(postId);
  if (!/^\d+$/.test(id)) throw new Error('X post IDs must be numeric.');

  const url = new URL(`${String(apiBaseUrl).replace(/\/+$/, '')}/${id}`);
  if (url.protocol !== 'https:') throw new Error('X API URL must use HTTPS.');
  Object.entries(TWEET_QUERY).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

export function normalizeXPostPayload(payload) {
  const tweet = payload?.data;
  if (!tweet?.id || typeof tweet.text !== 'string') return null;

  const author = (payload?.includes?.users || []).find((user) => String(user.id) === String(tweet.author_id));
  const mediaByKey = new Map((payload?.includes?.media || []).map((media) => [media.media_key, media]));
  const media = (tweet.attachments?.media_keys || [])
    .map((mediaKey) => mediaByKey.get(mediaKey))
    .filter(Boolean)
    .map((item) => ({
      type: item.type,
      url: item.url || item.preview_image_url || null,
      altText: item.alt_text || null
    }));

  return {
    data: {
      id: String(tweet.id),
      text: tweet.text,
      createdAt: tweet.created_at || null,
      author: author ? {
        id: String(author.id),
        name: author.name || null,
        username: author.username || null,
        profileImageUrl: author.profile_image_url || null
      } : null,
      publicMetrics: tweet.public_metrics || null,
      media
    },
    source: 'x-api'
  };
}

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

function upstreamError(status) {
  if (status === 401) return { code: 'auth-failure', message: 'X API authentication failed.' };
  if (status === 403) return { code: 'private', message: 'The X post is private or inaccessible.' };
  if (status === 404) return { code: 'deleted-post', message: 'The X post was not found or is unavailable.' };
  if (status === 429) return { code: 'rate-limit', message: 'The X API rate limit was reached.' };
  return { code: 'api-unavailable', message: 'The X API returned an unavailable response.' };
}

export function createXApiHandler({ bearerToken, apiBaseUrl, fetchImpl = globalThis.fetch } = {}) {
  const token = String(bearerToken || '').trim();
  return async function xApiHandler(request, response, next) {
    const requestUrl = new URL(request.url || '/', 'http://tweetmint.local');
    const match = requestUrl.pathname.match(/^\/posts\/(\d+)$/);
    if (!match) return typeof next === 'function' ? next() : undefined;

    if (!token) {
      sendJson(response, 503, {
        error: { code: 'configuration', message: 'X_BEARER_TOKEN is not configured on the server.' }
      });
      return undefined;
    }

    let url;
    try {
      url = buildXTweetUrl(match[1], apiBaseUrl || DEFAULT_X_API_BASE_URL);
    } catch {
      sendJson(response, 500, { error: { code: 'configuration', message: 'The X API endpoint is misconfigured.' } });
      return undefined;
    }

    try {
      const upstream = await fetchImpl(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (!upstream.ok) {
        sendJson(response, upstream.status, { error: upstreamError(upstream.status) });
        return undefined;
      }

      const payload = await upstream.json();
      const normalized = normalizeXPostPayload(payload);
      if (!normalized) {
        sendJson(response, 404, { error: upstreamError(404) });
        return undefined;
      }
      sendJson(response, 200, normalized);
    } catch {
      sendJson(response, 502, { error: { code: 'network-failure', message: 'Unable to reach the X API.' } });
    }
    return undefined;
  };
}
