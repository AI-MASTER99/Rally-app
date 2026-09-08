/** Contract between the vision model, the API route and the browser. */

import { z } from 'zod';

/** One row of a time table: ten cells, hectometre 0.0 through 0.9. */
export const ScannedRowSchema = z.object({
  /** The row label: whole kilometres since the start. */
  km: z.number().int(),
  /** `""` where the cell is blank or unreadable. */
  cells: z.array(z.string()),
});

/** One line of a road book. */
export const ScannedLegSchema = z.object({
  /** The printed distance, converted to metres. */
  distanceMetres: z.number(),
  /** The route instruction, as printed. */
  instruction: z.string(),
  /** The printed time, verbatim — its notation carries how precise it is. */
  time: z.string(),
});

/**
 * Both sheet kinds share one shape.
 *
 * A discriminated union would model this more tightly, but a flat object with
 * one array left empty survives a schema-constrained response far better, and
 * `kind` still says which array to read.
 */
export const ScannedSheetSchema = z.object({
  kind: z.enum(['timetable', 'roadbook']),
  /** The sheet's printed name, or `""`. */
  title: z.string(),
  /** Road books only: whether the distance column counts the leg or the route. */
  distanceKind: z.enum(['leg', 'cumulative']),
  /** Filled when `kind` is `timetable`, empty otherwise. */
  rows: z.array(ScannedRowSchema),
  /** Filled when `kind` is `roadbook`, empty otherwise. */
  legs: z.array(ScannedLegSchema),
});

export type ScannedSheet = z.infer<typeof ScannedSheetSchema>;

/** Image formats the Claude API accepts, and that a phone camera produces. */
export const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

export interface OcrRequest {
  /** Base64 image data, without the `data:` prefix. */
  imageBase64: string;
  mediaType: SupportedMediaType;
}
