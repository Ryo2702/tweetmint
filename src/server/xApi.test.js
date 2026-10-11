import { describe, expect, it, vi } from 'vitest';
import { buildXTweetUrl, createXApiHandler, normalizeXPostPayload } from './xApi.js';

function mockResponse() {
  return {
    statusCode: null,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(body) { this.body = body; }
  };
}

describe('xApi', () => {
  it('builds a lossless single-post lookup URL', () => {
    const url = new URL(buildXTweetUrl('9223372036854775807'));
    expect(url.origin + url.pathname).toBe('https://api.x.com/2/tweets/9223372036854775807');
    expect(url.searchParams.get('tweet.fields')).toContain('created_at');
    expect(url.searchParams.get('expansions')).toContain('author_id');
  });

  it('normalizes the real X v2 post shape without inventing missing data', () => {
    expect(normalizeXPostPayload({
      data: {
        id: '123',
        text: 'hello from X',
        author_id: '42',
        created_at: '2026-10-12T00:00:00.000Z',
        public_metrics: { like_count: 2 },
        attachments: { media_keys: ['3_1'] }
      },
      includes: {
        users: [{ id: '42', name: 'Mika', username: 'mika' }],
        media: [{ media_key: '3_1', type: 'photo', url: 'https://img.example/photo.png' }]
      }
    })).toEqual({
      data: {
        id: '123',
        text: 'hello from X',
        createdAt: '2026-10-12T00:00:00.000Z',
        author: { id: '42', name: 'Mika', username: 'mika', profileImageUrl: null },
        publicMetrics: { like_count: 2 },
        media: [{ type: 'photo', url: 'https://img.example/photo.png', altText: null }]
      },
      source: 'x-api'
    });
  });

  it('does not turn an empty X payload into fictional post data', () => {
    expect(normalizeXPostPayload(null)).toBeNull();
    expect(normalizeXPostPayload({ data: { id: '123' } })).toBeNull();
  });

  it('reports missing server credentials without making a request', async () => {
    const fetchMock = vi.fn();
    const response = mockResponse();
    await createXApiHandler({ fetchImpl: fetchMock })({ url: '/posts/123' }, response);
    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body).error.code).toBe('configuration');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the bearer token only on the server and returns normalized data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: '123', text: 'server post' } })
    });
    const response = mockResponse();
    await createXApiHandler({ bearerToken: 'server-only-token', fetchImpl: fetchMock })({ url: '/posts/123' }, response);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).data.text).toBe('server post');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/2/tweets/123'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer server-only-token' }) })
    );
  });

  it('preserves a credits-depleted response for the client', async () => {
    const response = mockResponse();
    await createXApiHandler({
      bearerToken: 'server-only-token',
      fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 402 })
    })({ url: '/posts/123' }, response);
    expect(response.statusCode).toBe(402);
    expect(JSON.parse(response.body).error.code).toBe('credits-depleted');
  });
});
