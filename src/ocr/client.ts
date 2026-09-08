/** Browser side: shrink the photo, send it to the API route, read it back. */

import { ScannedTableSchema, type ScannedTable } from './schema';

/**
 * The Claude API gains nothing from more than ~1568 px on the long edge, and
 * a 12 MP phone photo would otherwise blow past the request body limit.
 */
const MAX_EDGE = 1568;
const JPEG_QUALITY = 0.85;

export async function transcribePhoto(file: File, signal?: AbortSignal): Promise<ScannedTable> {
  const imageBase64 = await downscaleToBase64(file);

  const response = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg' }),
    signal,
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Reading the photo failed (${response.status}).`;
    throw new Error(message);
  }

  const parsed = ScannedTableSchema.safeParse(body);
  if (!parsed.success) throw new Error('The server returned an unexpected response.');
  return parsed.data;
}

/** Re-encode to a JPEG small enough to post, honouring EXIF rotation. */
async function downscaleToBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot process the photo.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) throw new Error('Could not encode the photo.');

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the photo.'));
    reader.readAsDataURL(blob);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}
