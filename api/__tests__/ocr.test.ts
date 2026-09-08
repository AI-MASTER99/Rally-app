import { describe, expect, it } from 'vitest';
import ocr, { handleOcr } from '../ocr';

/** Everything up to the point where the vision model would be called. */
const post = (body: unknown) =>
  handleOcr(
    new Request('http://localhost/api/ocr', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

const error = async (response: Response) => ((await response.json()) as { error: string }).error;

describe('POST /api/ocr', () => {
  it('exports the web standard signature Vercel routes to', () => {
    expect(typeof ocr.fetch).toBe('function');
  });

  it('answers a GET with a health check', async () => {
    const response = await handleOcr(new Request('http://localhost/api/ocr'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      hasApiKey: Boolean(process.env['ANTHROPIC_API_KEY']),
    });
  });

  it('rejects anything but GET or POST', async () => {
    const response = await handleOcr(
      new Request('http://localhost/api/ocr', { method: 'DELETE' }),
    );
    expect(response.status).toBe(405);
  });

  it('says so plainly when the server has no key', async () => {
    const key = process.env['ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];
    try {
      const response = await post({ imageBase64: 'abc', mediaType: 'image/jpeg' });
      expect(response.status).toBe(503);
      expect(await error(response)).toContain('ANTHROPIC_API_KEY');
    } finally {
      if (key !== undefined) process.env['ANTHROPIC_API_KEY'] = key;
    }
  });

  it('answers a malformed request even with no key configured', async () => {
    const key = process.env['ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];
    try {
      expect((await post({ mediaType: 'image/jpeg' })).status).toBe(400);
      expect((await post({ imageBase64: 'a', mediaType: 'image/heic' })).status).toBe(415);
    } finally {
      if (key !== undefined) process.env['ANTHROPIC_API_KEY'] = key;
    }
  });

  it('rejects a body that is not JSON', async () => {
    const response = await handleOcr(
      new Request('http://localhost/api/ocr', { method: 'POST', body: 'not json' }),
    );
    expect(response.status).toBe(400);
  });

  it('rejects a missing image', async () => {
    expect((await post({ mediaType: 'image/jpeg' })).status).toBe(400);
  });

  it('rejects an image type the Claude API does not take', async () => {
    const response = await post({ imageBase64: 'abc', mediaType: 'image/heic' });
    expect(response.status).toBe(415);
    expect(await error(response)).toContain('image/heic');
  });

  it('rejects an image too large to post', async () => {
    const response = await post({ imageBase64: 'a'.repeat(6_000_000), mediaType: 'image/jpeg' });
    expect(response.status).toBe(413);
  });
});
