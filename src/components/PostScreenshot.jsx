import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { isScreenshotReady } from '../services/postScreenshot.js';

export default function PostScreenshot({ asset, variant = 'full', onRetry, alt = 'Preserved source post screenshot' }) {
  const [broken, setBroken] = useState(false);
  const ready = isScreenshotReady(asset) && !broken;
  const image = variant === 'thumb' ? asset?.screenshotThumbUrl : asset?.screenshotUrl;

  if (!ready || !image) {
    return (
      <div className={`post-screenshot-placeholder post-screenshot-placeholder--${variant}`} role="img" aria-label="Preserved screenshot unavailable">
        <span>POST IMAGE UNAVAILABLE</span>
        <small>{asset?.screenshotStatus === 'removed' ? 'Asset removed' : asset?.error || 'Retry capture to restore the visual source.'}</small>
        {onRetry && <button className="pixel-button" type="button" onClick={onRetry}><RefreshCw /> Re-capture</button>}
      </div>
    );
  }

  return (
    <figure className={`post-screenshot post-screenshot--${variant}`}>
      <img src={image} alt={alt} onError={() => setBroken(true)} />
      {variant !== 'thumb' && <figcaption>CAPTURED · {asset.screenshotCreatedAt || asset.captureTimestamp || 'saved locally'}</figcaption>}
    </figure>
  );
}

