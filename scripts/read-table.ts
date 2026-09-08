/**
 * Read a time-table photo from disk and print the speed table.
 *
 *   ANTHROPIC_API_KEY=... npx vite-node scripts/read-table.ts foto.jpg
 *
 * The same code path the web app uses, minus the browser — handy for checking
 * a new sheet, or the transcription quality, without deploying anything.
 */

import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { recognizeSheet } from '../src/ocr/recognize';
import { interpretSheet } from '../src/ocr/interpret';
import type { SupportedMediaType } from '../src/ocr/schema';

const BY_EXTENSION: Record<string, SupportedMediaType> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const path = process.argv[2];
if (!path) {
  console.error('Usage: npx vite-node scripts/read-table.ts <photo>');
  process.exit(1);
}

const mediaType = BY_EXTENSION[extname(path).toLowerCase()];
if (!mediaType) {
  console.error(`Unsupported image type: ${extname(path)}`);
  process.exit(1);
}

const sheet = await recognizeSheet({
  imageBase64: readFileSync(path).toString('base64'),
  mediaType,
});
const result = interpretSheet(sheet);

console.log(
  `\n${sheet.title || sheet.kind} (${sheet.kind}) — route ends at ${result.routeEndKm.toFixed(2)} km\n`,
);
console.log('From km   To km   Avg speed');
result.segments.forEach((s, i) => {
  const speed = `${result.uncertain.includes(i) ? '~' : ''}${s.speedKmh}`;
  console.log(
    `${s.fromKm.toFixed(2).padStart(7)} ${s.toKm.toFixed(2).padStart(7)} ${speed.padStart(9)} km/h` +
      (s.instruction ? `   ${s.instruction}` : ''),
  );
});

if (result.unexplained > 0) {
  console.log(`\n${result.unexplained} entries on the sheet do not fit these speeds.`);
}
if (result.uncertain.length > 0) {
  console.log(`~ marks a speed the printed times are too coarse to pin to one whole km/h.`);
}
