/** Turn a transcription into the grid the solver works on. */

import { parseTime } from '../core/time';
import type { Grid } from '../core/types';
import type { ScannedTable } from './schema';

/**
 * Rows are placed by their printed kilometre label rather than by their
 * position in the list, so a row the model skipped cannot shift the rest.
 */
export function scannedTableToGrid(table: ScannedTable): Grid {
  const grid: Grid = [];
  for (const row of table.rows) {
    if (!Number.isInteger(row.km) || row.km < 0 || row.km > 999) continue;
    const cells: Grid[number] = new Array<null>(10).fill(null);
    row.cells.slice(0, 10).forEach((cell, i) => {
      cells[i] = parseTime(cell);
    });
    grid[row.km] = cells;
  }
  for (let km = 0; km < grid.length; km++) {
    grid[km] ??= new Array<null>(10).fill(null);
  }
  return grid;
}
