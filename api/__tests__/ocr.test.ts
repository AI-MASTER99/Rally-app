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

  it('rejects anything but POST', async () => {
    const response = await handleOcr(new Request('http://localhost/api/ocr'));
    expect(response.status).toBe(405);
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
