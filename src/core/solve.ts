/**
 * Recovering the speed segments from a scanned time table.
 *
 * The schedule is fully described by a list of breakpoints (always on a 100 m
 * boundary) and one integer average speed per segment. At v km/h a 100 m step
 * takes exactly 360/v seconds, so the exact time at hectometre `n` is a sum of
 * such steps. The printed table rounds those times to a tenth of a second.
 *
 * The table is enormously over-determined — roughly 160 cells decide a handful
 * of segments — and that redundancy is what makes the fit robust: a misread
 * cell is outvoted by its neighbours and then shows up as a mismatch.
 */

import type { Grid, Mismatch, Point, Segment, SolveResult } from './types';

/** Cells are printed to a tenth, so a correct cell is within 0.05 s. */
const TOLERANCE = 0.06;
/** Guard against absurd speeds produced by a badly misread cell. */
const MIN_SPEED = 1;
const MAX_SPEED = 250;
/** Seconds per 100 m at `v` km/h. */
const step = (v: number) => 360 / v;

const EPS = 1e-9;

/** Flatten a grid to observations, dropping blank cells. */
export function gridToPoints(grid: Grid): Point[] {
  const points: Point[] = [];
  grid.forEach((row, km) => {
    (row ?? []).forEach((cell, hectometre) => {
      if (cell != null && Number.isFinite(cell)) {
        points.push({ hm: km * 10 + hectometre, t: cell });
      }
    });
  });
  points.sort((a, b) => a.hm - b.hm);
  return points;
}

/**
 * Keep the largest subset whose times strictly increase with distance.
 *
 * Elapsed time can only go up, so any violation is a scan error. Taking the
 * longest increasing subsequence discards the single bad cell rather than
 * everything that follows it.
 */
export function keepMonotone(points: Point[]): { kept: Point[]; discarded: Point[] } {
  const n = points.length;
  if (n === 0) return { kept: [], discarded: [] };

  const best = new Array<number>(n).fill(1);
  const prev = new Array<number>(n).fill(-1);
  let endIdx = 0;

  for (let i = 0; i < n; i++) {
    const pi = points[i]!;
    for (let j = 0; j < i; j++) {
      const pj = points[j]!;
      if (pj.t < pi.t && pj.hm < pi.hm && best[j]! + 1 > best[i]!) {
        best[i] = best[j]! + 1;
        prev[i] = j;
      }
    }
    if (best[i]! > best[endIdx]!) endIdx = i;
  }

  const keepIdx = new Set<number>();
  for (let i = endIdx; i >= 0; i = prev[i]!) {
    keepIdx.add(i);
    if (prev[i] === -1) break;
  }

  const kept: Point[] = [];
  const discarded: Point[] = [];
  points.forEach((p, i) => (keepIdx.has(i) ? kept : discarded).push(p));
  return { kept, discarded };
}

/**
 * Best integer speed for one segment, given the exact time `startT` at
 * `startHm`. Least squares through the origin over the segment's own points.
 */
function fitSpeed(points: Point[], startHm: number, startT: number): number | null {
  let num = 0;
  let den = 0;
  for (const p of points) {
    const k = p.hm - startHm;
    if (k <= 0) continue;
    num += k * (p.t - startT);
    den += k * k;
  }
  if (den === 0 || num <= 0) return null;
  const secondsPerHm = num / den;
  return clampSpeed(Math.round(360 / secondsPerHm));
}

const clampSpeed = (v: number) => Math.min(MAX_SPEED, Math.max(MIN_SPEED, v));

/**
 * How far can one constant integer speed reach from `points[start]`?
 *
 * Each further point constrains the seconds-per-100 m to an interval; the
 * intervals are intersected as the segment grows, which is why a long segment
 * pins its speed far more sharply than a single cell ever could (42 and
 * 43 km/h differ by only 0.2 s per 100 m — less than two roundings apart).
 */
function extendSegment(
  points: Point[],
  start: number,
  startT: number,
): { endIdx: number; speed: number } {
  const origin = points[start]!;
  let lo = 0;
  let hi = Infinity;
  let endIdx = -1;
  let speed = 0;

  for (let i = start + 1; i < points.length; i++) {
    const p = points[i]!;
    const k = p.hm - origin.hm;
    const nextLo = Math.max(lo, (p.t - startT - TOLERANCE) / k);
    const nextHi = Math.min(hi, (p.t - startT + TOLERANCE) / k);
    if (nextLo > nextHi) break;

    // Integer speeds whose step length falls inside the interval.
    const vLo = Math.max(MIN_SPEED, Math.ceil(360 / nextHi - EPS));
    const vHi = Math.min(MAX_SPEED, Math.floor(360 / nextLo + EPS));
    if (vLo > vHi) break;

    lo = nextLo;
    hi = nextHi;
    endIdx = i;
    speed =
      vLo === vHi
        ? vLo
        : Math.min(vHi, Math.max(vLo, fitSpeed(points.slice(start, i + 1), origin.hm, startT) ?? vLo));
  }

  if (endIdx === -1) {
    // Degenerate: not even the neighbouring cell fits any sane speed.
    const p = points[start + 1]!;
    const secondsPerHm = (p.t - startT) / (p.hm - origin.hm);
    return { endIdx: start + 1, speed: clampSpeed(Math.round(360 / secondsPerHm)) };
  }
  return { endIdx, speed };
}

/** Breakpoints, in hectometres, including the first and last observation. */
function initialBreakpoints(points: Point[]): number[] {
  const breaks = [points[0]!.hm];
  let start = 0;
  let startT = points[0]!.t;

  while (start < points.length - 1) {
    const { endIdx, speed } = extendSegment(points, start, startT);
    startT += (points[endIdx]!.hm - points[start]!.hm) * step(speed);
    start = endIdx;
    breaks.push(points[start]!.hm);
  }
  return breaks;
}

interface Candidate {
  breaks: number[];
  segments: Segment[];
  mismatches: Mismatch[];
}

/**
 * Chain the segments defined by `breaks`, picking the best integer speed for
 * each, and check every observation against the result.
 */
function evaluate(points: Point[], breaks: number[]): Candidate {
  const segments: Segment[] = [];
  // Exact model time at each observed hectometre.
  const expected = new Map<number, number>();
  let startT = points[0]!.t;
  let previousSpeed = 50;

  for (let i = 0; i < breaks.length - 1; i++) {
    const from = breaks[i]!;
    const to = breaks[i + 1]!;
    const inside = points.filter((p) => p.hm > from && p.hm <= to);
    const speed = fitSpeed(inside, from, startT) ?? previousSpeed;
    previousSpeed = speed;

    expected.set(from, startT);
    for (const p of inside) expected.set(p.hm, startT + (p.hm - from) * step(speed));

    segments.push({ fromKm: from / 10, toKm: to / 10, speedKmh: speed });
    startT += (to - from) * step(speed);
  }

  const mismatches: Mismatch[] = [];
  for (const p of points) {
    const e = expected.get(p.hm);
    if (e === undefined || Math.abs(e - p.t) > TOLERANCE) {
      mismatches.push({ km: p.hm / 10, observed: p.t, expected: e ?? NaN });
    }
  }
  return { breaks, segments: mergeEqual(segments), mismatches };
}

/** Adjacent segments at the same speed are one segment. */
function mergeEqual(segments: Segment[]): Segment[] {
  const merged: Segment[] = [];
  for (const s of segments) {
    const last = merged[merged.length - 1];
    if (last && last.speedKmh === s.speedKmh && last.toKm === s.fromKm) last.toKm = s.toKm;
    else merged.push({ ...s });
  }
  return merged;
}

/** Fewer unexplained cells wins; on a tie, the simpler schedule wins. */
function isBetter(a: Candidate, b: Candidate): boolean {
  if (a.mismatches.length !== b.mismatches.length) return a.mismatches.length < b.mismatches.length;
  return a.segments.length < b.segments.length;
}

/**
 * Nudge, drop and add breakpoints as long as it explains more cells.
 *
 * The greedy pass can overshoot a breakpoint by a cell or two, and a misread
 * cell can inject a spurious one; both are repaired here.
 */
function refine(points: Point[], start: Candidate): Candidate {
  let best = start;
  const firstHm = points[0]!.hm;
  const lastHm = points[points.length - 1]!.hm;

  for (let round = 0; round < 20; round++) {
    let improved = false;

    const proposals: number[][] = [];
    for (let i = 1; i < best.breaks.length - 1; i++) {
      for (const delta of [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]) {
        const moved = [...best.breaks];
        moved[i] = moved[i]! + delta;
        if (moved[i]! > moved[i - 1]! && moved[i]! < moved[i + 1]!) proposals.push(moved);
      }
      proposals.push(best.breaks.filter((_, j) => j !== i));
    }
    // A breakpoint the greedy pass missed usually sits at the first bad cell.
    for (const m of best.mismatches) {
      for (const hm of [m.km * 10, m.km * 10 - 1, m.km * 10 + 1]) {
        if (hm <= firstHm || hm >= lastHm || best.breaks.includes(hm)) continue;
        proposals.push([...best.breaks, hm].sort((a, b) => a - b));
      }
    }

    for (const breaks of proposals) {
      const candidate = evaluate(points, breaks);
      if (isBetter(candidate, best)) {
        best = candidate;
        improved = true;
      }
    }
    if (!improved) break;
  }
  return best;
}

/** Recover the speed schedule from a scanned time table. */
export function solveGrid(grid: Grid): SolveResult {
  return solvePoints(gridToPoints(grid));
}

/** Recover the speed schedule from raw observations. */
export function solvePoints(raw: Point[]): SolveResult {
  const { kept, discarded } = keepMonotone(raw);

  if (kept.length < 2) {
    return {
      segments: [],
      routeEndKm: kept.length ? kept[kept.length - 1]!.hm / 10 : 0,
      cellsChecked: kept.length,
      mismatches: [],
      discarded,
      exact: false,
    };
  }

  const best = refine(kept, evaluate(kept, initialBreakpoints(kept)));

  return {
    segments: best.segments,
    routeEndKm: kept[kept.length - 1]!.hm / 10,
    cellsChecked: kept.length,
    mismatches: best.mismatches,
    discarded,
    exact: best.mismatches.length === 0 && discarded.length === 0,
  };
}

/** Rebuild the full time table from a schedule — used to show the fit. */
export function segmentsToGrid(segments: Segment[], startSeconds = 0): Grid {
  if (segments.length === 0) return [];
  const endHm = Math.round(segments[segments.length - 1]!.toKm * 10);
  const times: number[] = [startSeconds];
  let t = startSeconds;

  for (let hm = 1; hm <= endHm; hm++) {
    const km = (hm - 0.5) / 10;
    const seg = segments.find((s) => km >= s.fromKm && km <= s.toKm);
    t += step(seg ? seg.speedKmh : segments[segments.length - 1]!.speedKmh);
    times.push(t);
  }

  const grid: Grid = [];
  for (let hm = 0; hm <= endHm; hm++) {
    const km = Math.floor(hm / 10);
    (grid[km] ??= new Array<null>(10).fill(null))[hm % 10] = times[hm]!;
  }
  return grid;
}
