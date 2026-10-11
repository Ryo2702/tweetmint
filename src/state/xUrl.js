const SUPPORTED_HOSTS = new Set([
  'x.com',
  'www.x.com',
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
]);

const failure = (reason) => ({ ok: false, reason });

export function parseXPostUrl(value) {
  const input = String(value ?? '').trim();
  if (!input) return failure('invalid-url');

  let url;
  try {
    url = new URL(input);
  } catch {
    return failure('invalid-url');
  }

  if (!['http:', 'https:'].includes(url.protocol)) return failure('invalid-url');
  if (!SUPPORTED_HOSTS.has(url.hostname.toLowerCase())) return failure('unsupported-domain');

  const segments = url.pathname.split('/').filter(Boolean);
  let route;
  let postId;
  if (segments.length >= 3 && segments[1].toLowerCase() === 'status') {
    [route, , postId] = segments;
  } else if (segments.length >= 3 && segments[0].toLowerCase() === 'i' && segments[1].toLowerCase() === 'web' && segments[2].toLowerCase() === 'status') {
    route = 'i/web';
    postId = segments[3];
  } else if (segments.length >= 3 && segments[0].toLowerCase() === 'i' && segments[1].toLowerCase() === 'status') {
    route = 'i';
    postId = segments[2];
  } else {
    return failure('missing-post-id');
  }

  if (!postId) return failure('missing-post-id');
  if (!/^\d+$/.test(postId)) return failure('missing-post-id');

  return {
    ok: true,
    postId,
    canonicalUrl: `https://x.com/${route}/status/${postId}`,
  };
}

export function validateXUrl(value) {
  return parseXPostUrl(value).postId || null;
}
