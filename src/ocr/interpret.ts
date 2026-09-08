/** Turn a transcribed sheet, of either kind, into one set of speed segments. */

import { solveRoadbook, solveGrid, type Segment } from '../core';
import type { ScannedSheet } from './schema';
import { scannedTableToGrid } from './toGrid';

export interface Interpretation {
  segments: Segment[];
  routeEndKm: number;
  /** Entries on the sheet that the derived speeds do not account for. */
  unexplained: number;
}

export function interpretSheet(sheet: ScannedSheet): Interpretation {
  if (sheet.kind === 'roadbook') {
    const { segments, routeEndKm, skipped } = solveRoadbook(sheet.legs, sheet.distanceKind);
    return { segments, routeEndKm, unexplained: skipped.length };
  }

  const result = solveGrid(scannedTableToGrid(sheet.rows));
  return {
    segments: result.segments,
    routeEndKm: result.routeEndKm,
    // A time table is heavily over-determined, so a cell the fit cannot
    // explain is a scan error rather than a wrong schedule — but it is the
    // crew who should decide that, so it is counted and surfaced.
    unexplained: result.mismatches.length + result.discarded.length,
  };
}
