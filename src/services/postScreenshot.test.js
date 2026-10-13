import { describe, expect, it } from 'vitest';
import { createPostScreenshotAsset, createScreenshotFailure, createUploadedScreenshotAsset, isScreenshotReady } from './postScreenshot.js';

describe('post screenshot assets', () => {
  it('creates a stable full-size asset and thumbnail from normalized X data', () => {
    const asset = createPostScreenshotAsset({
      source: { postId: '123456789', canonicalUrl: 'https://x.com/mika/status/123456789' },
      preview: { data: { id: '123456789', text: 'A preserved post', createdAt: '2026-10-12T00:00:00.000Z', author: { id: '42', username: 'mika', name: 'Mika' } } },
      capturedAt: '2026-10-12T01:00:00.000Z'
    });

    expect(asset).toMatchObject({
      screenshotAssetId: 'x-post-123456789-screenshot',
      screenshotWidth: 1200,
      screenshotHeight: 760,
      screenshotStatus: 'ready',
      sourceAuthorId: '42',
      sourceAuthorUsername: 'mika',
      screenshotCreatedAt: '2026-10-12T01:00:00.000Z'
    });
    expect(isScreenshotReady(asset)).toBe(true);
    expect(decodeURIComponent(asset.screenshotUrl.split(',')[1])).toContain('A preserved post');
    expect(asset.screenshotThumbUrl).not.toBe(asset.screenshotUrl);
  });

  it('represents a failed capture without inventing an image URL', () => {
    const asset = createScreenshotFailure({ postId: '123' }, 'failed', 'capture failed');
    expect(asset).toMatchObject({ screenshotAssetId: 'x-post-123-screenshot', screenshotStatus: 'failed', error: 'capture failed' });
    expect(asset.screenshotUrl).toBeNull();
    expect(isScreenshotReady(asset)).toBe(false);
  });

  it('keeps a local uploaded image and caption as a ready asset', () => {
    const asset = createUploadedScreenshotAsset({
      source: { postId: 'upload-1' },
      imageUrl: 'data:image/png;base64,image',
      thumbnailUrl: 'data:image/png;base64,thumb',
      caption: 'A caption for the uploaded post.'
    });

    expect(asset).toMatchObject({
      screenshotAssetId: 'upload-upload-1-screenshot',
      sourceType: 'local-upload',
      sourcePostText: 'A caption for the uploaded post.',
      screenshotStatus: 'ready'
    });
    expect(isScreenshotReady(asset)).toBe(true);
  });

  it('preserves an uploaded article image as a source-linked proposal', () => {
    const asset = createUploadedScreenshotAsset({
      source: { postId: 'news-123', sourceType: 'news', canonicalUrl: 'https://example.com/story', feedItemId: '123', sourceContentId: 'publisher-123' },
      imageUrl: 'data:image/png;base64,image'
    });
    expect(asset).toMatchObject({ sourceType: 'news', sourcePostUrl: 'https://example.com/story', sourcePostId: 'news-123', feedItemId: '123', sourceContentId: 'publisher-123' });
    expect(() => createPostScreenshotAsset({ source: { postId: 'news-123' } })).toThrow('numeric X post ID');
  });
});

