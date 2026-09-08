import { describe, expect, it } from 'vitest';
import { solveGrid } from '../../core';
import { RT10_ROWS, RT10_SEGMENTS } from '../../core/__tests__/fixtures';
import { scannedTableToGrid } from '../toGrid';
import { ScannedTableSchema } from '../schema';

/** The shape the vision model is asked to return for the RT 10 sheet. */
function rt10Transcription() {
  return ScannedTableSchema.parse({
    title: 'Time Table RT 10',
    rows: RT10_ROWS.map((row, km) => {
      const cells = row.split(/\s+/);
      while (cells.length < 10) cells.push('');
      return { km, cells };
    }),
  });
}

describe('scannedTableToGrid', () => {
  it('feeds the solver straight from a transcription', () => {
    const result = solveGrid(scannedTableToGrid(rt10Transcription()));
    expect(result.segments).toEqual(RT10_SEGMENTS);
    expect(result.exact).toBe(true);
  });

  it('places rows by their printed label, not by list position', () => {
    const table = rt10Transcription();
    // The model skipped row 1 entirely; the rest must not shift up.
    table.rows = table.rows.filter((row) => row.km !== 1);
    const grid = scannedTableToGrid(table);
    expect(grid[1]).toEqual(new Array(10).fill(null));
    expect(solveGrid(grid).segments).toEqual(RT10_SEGMENTS);
  });

  it('treats unreadable cells as blank rather than as zero', () => {
    const table = rt10Transcription();
    table.rows[3]!.cells[4] = '';
    table.rows[3]!.cells[5] = '??';
    const grid = scannedTableToGrid(table);
    expect(grid[3]![4]).toBeNull();
    expect(grid[3]![5]).toBeNull();
    expect(solveGrid(grid).segments).toEqual(RT10_SEGMENTS);
  });

  it('ignores rows with an impossible label', () => {
    const table = rt10Transcription();
    table.rows.push({ km: -3, cells: new Array(10).fill('00:01.0') });
    expect(solveGrid(scannedTableToGrid(table)).segments).toEqual(RT10_SEGMENTS);
  });
});
