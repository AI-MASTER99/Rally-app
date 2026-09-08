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
import { formatTime, solveGrid } from '../src/core';
import { recognizeTable } from '../src/ocr/recognize';
import { scannedTableToGrid } from '../src/ocr/toGrid';
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

const table = await recognizeTable({
  imageBase64: readFileSync(path).toString('base64'),
  mediaType,
});
const grid = scannedTableToGrid(table);
const result = solveGrid(grid);

console.log(`\n${table.title || 'Time table'} — route ends at ${result.routeEndKm.toFixed(2)} km\n`);
console.log('From km   To km   Avg speed');
for (const s of result.segments) {
  console.log(
    `${s.fromKm.toFixed(2).padStart(7)} ${s.toKm.toFixed(2).padStart(7)} ${String(s.speedKmh).padStart(9)} km/h`,
  );
}

console.log(
  `\n${result.cellsChecked - result.mismatches.length}/${result.cellsChecked} scanned cells agree with this schedule.`,
);
for (const m of result.mismatches) {
  console.log(
    `  ${m.km.toFixed(2)} km: read ${formatTime(m.observed)}, expected ${formatTime(m.expected)}`,
  );
}
for (const p of result.discarded) {
  console.log(`  ${(p.hm / 10).toFixed(2)} km: read ${formatTime(p.t)}, runs backwards — ignored`);
}
