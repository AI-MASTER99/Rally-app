/** Contract between the vision model, the API route and the browser. */

import { z } from 'zod';

export const ScannedRowSchema = z.object({
  /** The row label: whole kilometres since the start. */
  km: z.number().int(),
  /** Ten cells, hectometre 0.0 through 0.9, `""` where the cell is blank. */
  cells: z.array(z.string()),
});

export const ScannedTableSchema = z.object({
  /** The table's own name, e.g. "Time Table RT 10". `""` when not printed. */
  title: z.string(),
  rows: z.array(ScannedRowSchema),
});

export type ScannedTable = z.infer<typeof ScannedTableSchema>;

/** Image formats the Claude API accepts, and that a phone camera produces. */
export const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

export interface OcrRequest {
  /** Base64 image data, without the `data:` prefix. */
  imageBase64: string;
  mediaType: SupportedMediaType;
}
