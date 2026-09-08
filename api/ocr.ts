/**
 * POST /api/ocr — transcribe a photographed route sheet.
 *
 * Deployed as a serverless function and mounted into the Vite dev server by
 * `devApiPlugin`, so `npm run dev` behaves the same.
 *
 * The default export is an object with a `fetch` method: that is the web
 * standard signature Vercel's Node runtime recognises for files in `/api`. A
 * bare default-exported function would be read as the older Node.js
 * `(request, response)` handler instead, and this one would be handed an
 * `IncomingMessage` that has no `.json()`.
 */

import { OcrError, recognizeSheet } from '../src/ocr/recognize';
import { SUPPORTED_MEDIA_TYPES, type SupportedMediaType } from '../src/ocr/schema';

/** A downscaled photo is well under this; the ceiling only stops abuse. */
const MAX_IMAGE_BYTES = 4_000_000;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export async function handleOcr(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let payload: { imageBase64?: unknown; mediaType?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400);
  }

  const { imageBase64, mediaType } = payload;
  if (typeof imageBase64 !== 'string' || imageBase64 === '') {
    return json({ error: 'Missing image data.' }, 400);
  }
  if (!SUPPORTED_MEDIA_TYPES.includes(mediaType as SupportedMediaType)) {
    return json({ error: `Unsupported image type: ${String(mediaType)}` }, 415);
  }
  // Base64 inflates by 4/3; compare against the decoded size.
  if (imageBase64.length * 0.75 > MAX_IMAGE_BYTES) {
    return json({ error: 'Image too large. Take the photo again from closer by.' }, 413);
  }

  try {
    const table = await recognizeSheet({
      imageBase64,
      mediaType: mediaType as SupportedMediaType,
    });
    return json(table, 200);
  } catch (error) {
    if (error instanceof OcrError) return json({ error: error.message }, error.status);
    console.error('OCR failed', error);
    return json({ error: 'Reading the photo failed. Try again.' }, 502);
  }
}

export default { fetch: handleOcr };
