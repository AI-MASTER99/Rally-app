import { describe, expect, it } from 'vitest';
import { formatTime, parseTime } from '../time';
import { gridToPoints, keepMonotone, segmentsToGrid, solveGrid, solvePoints } from '../solve';
import type { Grid, Point } from '../types';
import { RT10_ROWS, RT10_SEGMENTS, rt10Grid } from './fixtures';

/** Build a table from a schedule, rounded to a tenth exactly as printed. */
function tableFor(segments: { fromKm: number; toKm: number; speedKmh: number }[]): Point[] {
  const points: Point[] = [{ hm: 0, t: 0 }];
  let t = 0;
  for (const s of segments) {
    for (let hm = Math.round(s.fromKm * 10) + 1; hm <= Math.round(s.toKm * 10); hm++) {
      t += 360 / s.speedKmh;
      points.push({ hm, t: Math.round(t * 10) / 10 });
    }
  }
  return points;
}

describe('solveGrid on the Zoute Rally RT 10 sheet', () => {
  const result = solveGrid(rt10Grid());

  it('recovers the printed speed table', () => {
    expect(result.segments).toEqual(RT10_SEGMENTS);
  });

  it('explains every scanned cell', () => {
    expect(result.mismatches).toEqual([]);
    expect(result.discarded).toEqual([]);
    expect(result.exact).toBe(true);
    expect(result.cellsChecked).toBe(61);
  });

  it('finds where the route ends', () => {
    expect(result.routeEndKm).toBe(6.0);
  });

  it('reproduces the sheet from the segments it found', () => {
    const rebuilt = segmentsToGrid(result.segments);
    for (const p of gridToPoints(rt10Grid())) {
      expect(formatTime(rebuilt[Math.floor(p.hm / 10)]![p.hm % 10]!)).toBe(formatTime(p.t));
    }
  });
});

describe('robustness against scan errors', () => {
  /** Replace one cell of the sheet with `text`. */
  function corrupt(...edits: [km: number, hm: number, text: string][]): Grid {
    const grid = rt10Grid();
    for (const [km, hm, text] of edits) grid[km]![hm] = parseTime(text);
    return grid;
  }

  it('survives a digit misread in the middle of a segment', () => {
    // 03:42.9 read as 08:42.9 — plausible for a 3 smudged into an 8.
    const result = solveGrid(corrupt([2, 6, '08:42.9']));
    expect(result.segments).toEqual(RT10_SEGMENTS);
    expect(result.exact).toBe(false);
  });

  it('survives several independent misreads and points at them', () => {
    const result = solveGrid(corrupt([0, 4, '00:39.3'], [3, 2, '04:33.7'], [5, 8, '08:32.1']));
    expect(result.segments).toEqual(RT10_SEGMENTS);
    expect(result.mismatches.map((m) => m.km).sort((a, b) => a - b)).toEqual([0.4, 3.2, 5.8]);
    for (const m of result.mismatches) {
      expect(Math.abs(m.observed - m.expected)).toBeGreaterThan(0.06);
    }
  });

  it('survives a cell dropped by the scan', () => {
    const grid = rt10Grid();
    grid[4]![5] = null; // the 5.0 km breakpoint neighbourhood
    grid[4]![6] = null;
    expect(solveGrid(grid).segments).toEqual(RT10_SEGMENTS);
  });

  it('discards a time that runs backwards', () => {
    const result = solveGrid(corrupt([1, 3, '00:51.4']));
    expect(result.segments).toEqual(RT10_SEGMENTS);
    expect(result.discarded).toEqual([{ hm: 13, t: 51.4 }]);
  });
});

describe('keepMonotone', () => {
  it('drops the single offender, not everything after it', () => {
    const points: Point[] = [
      { hm: 0, t: 0 },
      { hm: 1, t: 10 },
      { hm: 2, t: 900 },
      { hm: 3, t: 30 },
      { hm: 4, t: 40 },
    ];
    const { kept, discarded } = keepMonotone(points);
    expect(discarded).toEqual([{ hm: 2, t: 900 }]);
    expect(kept).toHaveLength(4);
  });
});

describe('synthetic schedules', () => {
  it('separates speeds that differ by 1 km/h', () => {
    const segments = [
      { fromKm: 0, toKm: 1.5, speedKmh: 50 },
      { fromKm: 1.5, toKm: 3.0, speedKmh: 51 },
      { fromKm: 3.0, toKm: 4.5, speedKmh: 50 },
    ];
    expect(solvePoints(tableFor(segments)).segments).toEqual(segments);
  });

  it('handles a slow neutralisation between fast segments', () => {
    const segments = [
      { fromKm: 0, toKm: 3.0, speedKmh: 60 },
      { fromKm: 3.0, toKm: 3.3, speedKmh: 15 },
      { fromKm: 3.3, toKm: 8.0, speedKmh: 55 },
    ];
    expect(solvePoints(tableFor(segments)).segments).toEqual(segments);
  });

  it('handles a long single-speed route', () => {
    const segments = [{ fromKm: 0, toKm: 15.0, speedKmh: 38 }];
    const result = solvePoints(tableFor(segments));
    expect(result.segments).toEqual(segments);
    expect(result.exact).toBe(true);
  });
});

describe('degenerate input', () => {
  it('returns nothing for an empty table', () => {
    const result = solveGrid([]);
    expect(result.segments).toEqual([]);
    expect(result.exact).toBe(false);
  });

  it('returns nothing for a single readable cell', () => {
    const result = solveGrid([[0, null, null]]);
    expect(result.segments).toEqual([]);
    expect(result.cellsChecked).toBe(1);
  });
});

describe('fixture integrity', () => {
  it('transcribes ten cells per row up to the end of the route', () => {
    expect(RT10_ROWS.slice(0, 6).every((r) => r.split(/\s+/).length === 10)).toBe(true);
  });
});
