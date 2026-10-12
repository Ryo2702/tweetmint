const SCREENSHOT_WIDTH = 1200;
const SCREENSHOT_HEIGHT = 760;

const escapeXml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const wrapText = (value, maxLength = 62) => {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ['No post text was returned.'];
  const lines = [];
  let line = '';
  words.forEach((word) => {
    if ((line + (line ? ' ' : '') + word).length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line += `${line ? ' ' : ''}${word}`;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, 7);
};

const dataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const assetIdFor = (postId) => `x-post-${String(postId)}-screenshot`;

export function normalizeScreenshotSource(source = {}, preview = {}) {
  const data = preview?.data || preview || {};
  const author = data.author || {};
  return {
    sourcePostId: String(source.postId || data.id || ''),
    sourcePostUrl: source.canonicalUrl || data.url || null,
    sourceAuthorUsername: author.username || data.username || null,
    sourceAuthorId: author.id || data.authorId || data.author_id || null,
    sourceAuthorName: author.name || data.authorName || null,
    sourcePostTimestamp: data.createdAt || data.created_at || data.timestamp || null,
    sourcePostText: data.text || data.content || ''
  };
}

function renderScreenshot(source, width, height) {
  const username = source.sourceAuthorUsername ? `@${String(source.sourceAuthorUsername).replace(/^@/, '')}` : '@unknown';
  const authorName = source.sourceAuthorName || username.replace(/^@/, '');
  const lines = wrapText(source.sourcePostText);
  const postLines = lines.map((line, index) => `<text x="86" y="${310 + index * 47}" font-family="monospace" font-size="32" font-weight="700" fill="#f7f0d8">${escapeXml(line)}</text>`).join('');
  const timestampValue = source.sourcePostTimestamp ? new Date(source.sourcePostTimestamp) : null;
  const timestamp = timestampValue && !Number.isNaN(timestampValue.valueOf())
    ? timestampValue.toISOString()
    : source.sourcePostTimestamp || 'timestamp unavailable';
  const safeTimestamp = escapeXml(timestamp);
  const safeUrl = escapeXml(source.sourcePostUrl || 'source URL unavailable');
  const safeId = escapeXml(source.sourcePostId || 'unknown');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${SCREENSHOT_WIDTH} ${SCREENSHOT_HEIGHT}" role="img" aria-labelledby="title desc">
    <title id="title">Preserved X post ${safeId}</title>
    <desc id="desc">A saved TweetMint screenshot of ${escapeXml(username)}'s source post.</desc>
    <rect width="1200" height="760" fill="#080b09"/>
    <rect x="34" y="34" width="1132" height="692" fill="#101710" stroke="#b8ff3b" stroke-width="4"/>
    <rect x="62" y="62" width="1076" height="72" fill="#182218" stroke="#4c5d49" stroke-width="2"/>
    <rect x="82" y="82" width="31" height="31" fill="#b8ff3b" stroke="#f7f0d8" stroke-width="3"/>
    <text x="98" y="106" text-anchor="middle" font-family="monospace" font-size="22" font-weight="900" fill="#10140e">↗</text>
    <text x="136" y="91" font-family="monospace" font-size="20" font-weight="900" fill="#f7f0d8">${escapeXml(authorName)}</text>
    <text x="136" y="116" font-family="monospace" font-size="16" fill="#98a294">${escapeXml(username)}</text>
    <text x="86" y="190" font-family="monospace" font-size="15" letter-spacing="2" fill="#ffb765">ORIGINAL X POST · PRESERVED BY TWEETMINT</text>
    ${postLines}
    <line x1="86" y1="604" x2="1114" y2="604" stroke="#3d4d3b" stroke-width="2" stroke-dasharray="8 8"/>
    <text x="86" y="645" font-family="monospace" font-size="16" fill="#9ea697">POST ID  ${safeId}</text>
    <text x="86" y="675" font-family="monospace" font-size="14" fill="#9ea697">${safeTimestamp}</text>
    <text x="1114" y="645" text-anchor="end" font-family="monospace" font-size="14" fill="#b8ff3b">SOURCE URL</text>
    <text x="1114" y="675" text-anchor="end" font-family="monospace" font-size="12" fill="#d8d2bc">${safeUrl.slice(0, 84)}</text>
  </svg>`;
}

export function createPostScreenshotAsset({ source, preview, capturedAt = new Date().toISOString() } = {}) {
  const normalized = normalizeScreenshotSource(source, preview);
  if (!/^\d+$/.test(normalized.sourcePostId)) throw new Error('A numeric X post ID is required to capture a screenshot.');

  const svg = renderScreenshot(normalized, SCREENSHOT_WIDTH, SCREENSHOT_HEIGHT);
  const thumbSvg = renderScreenshot(normalized, 480, 304);
  return {
    screenshotAssetId: assetIdFor(normalized.sourcePostId),
    screenshotUrl: dataUrl(svg),
    screenshotThumbUrl: dataUrl(thumbSvg),
    assetUrl: dataUrl(svg),
    assetThumbUrl: dataUrl(thumbSvg),
    screenshotWidth: SCREENSHOT_WIDTH,
    screenshotHeight: SCREENSHOT_HEIGHT,
    screenshotCreatedAt: capturedAt,
    captureTimestamp: capturedAt,
    screenshotStatus: 'ready',
    assetStatus: 'ready',
    ...normalized
  };
}

export function createUploadedScreenshotAsset({ source, imageUrl, thumbnailUrl = imageUrl, caption = '', capturedAt = new Date().toISOString(), width = 1200, height = 760, mimeType = 'image/*' } = {}) {
  const sourcePostId = String(source?.postId || '');
  if (!sourcePostId || !imageUrl) throw new Error('An uploaded image and local source ID are required.');
  return {
    screenshotAssetId: `upload-${sourcePostId}-screenshot`,
    screenshotUrl: imageUrl,
    screenshotThumbUrl: thumbnailUrl,
    assetUrl: imageUrl,
    assetThumbUrl: thumbnailUrl,
    screenshotWidth: width,
    screenshotHeight: height,
    screenshotCreatedAt: capturedAt,
    captureTimestamp: capturedAt,
    screenshotStatus: 'ready',
    assetStatus: 'ready',
    screenshotMimeType: mimeType,
    screenshotFormat: String(mimeType).split('/')[1] || 'image',
    sourceType: 'local-upload',
    sourcePostId,
    sourcePostUrl: source?.canonicalUrl || null,
    sourcePostText: caption
  };
}

export async function rasterizeScreenshotAsset(asset) {
  if (!isScreenshotReady(asset) || typeof document === 'undefined' || typeof Image === 'undefined') return asset;
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = asset.screenshotWidth;
        canvas.height = asset.screenshotHeight;
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        const thumbnail = document.createElement('canvas');
        thumbnail.width = 480;
        thumbnail.height = 304;
        thumbnail.getContext('2d').drawImage(image, 0, 0, thumbnail.width, thumbnail.height);
        const screenshotUrl = canvas.toDataURL('image/png');
        const screenshotThumbUrl = thumbnail.toDataURL('image/png');
        resolve({
          ...asset,
          screenshotSourceUrl: asset.screenshotUrl,
          screenshotThumbSourceUrl: asset.screenshotThumbUrl,
          screenshotUrl,
          screenshotThumbUrl,
          assetUrl: screenshotUrl,
          assetThumbUrl: screenshotThumbUrl,
          screenshotMimeType: 'image/png',
          screenshotFormat: 'png'
        });
      } catch {
        resolve(asset);
      }
    };
    image.onerror = () => resolve(asset);
    image.src = asset.screenshotUrl;
  });
}

export function createScreenshotFailure(source = {}, status = 'failed', message = '') {
  const normalized = normalizeScreenshotSource(source);
  return {
    screenshotAssetId: normalized.sourcePostId ? assetIdFor(normalized.sourcePostId) : null,
    screenshotUrl: null,
    screenshotThumbUrl: null,
    assetUrl: null,
    assetThumbUrl: null,
    screenshotWidth: SCREENSHOT_WIDTH,
    screenshotHeight: SCREENSHOT_HEIGHT,
    screenshotCreatedAt: null,
    captureTimestamp: null,
    screenshotStatus: status,
    assetStatus: status,
    error: message || 'Screenshot unavailable.',
    ...normalized
  };
}

export function isScreenshotReady(asset) {
  return Boolean(asset?.screenshotStatus === 'ready' && asset.screenshotUrl && asset.screenshotThumbUrl);
}

