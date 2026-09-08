/**
 * Domain model for rally time tables.
 *
 * A time table gives the cumulative elapsed time since the start of the stage
 * at every 100 m. Rows are whole kilometres, columns are hectometres (100 m),
 * so `grid[3][7]` is the time at 3.7 km.
 *
 * The underlying schedule is piecewise linear in distance: the organiser picks
 * a handful of segments, each driven at a constant average speed. The purpose
 * of this app is to recover those segments from a photo of the table.
 */

/** Cumulative time in seconds, or `null` when the cell is blank/unreadable. */
export type Cell = number | null;

/** `grid[km][hectometre]`, hectometre 0..9. Rows may be short or ragged. */
export type Grid = Cell[][];

/** One observation: `hm` is the distance in hectometres, `t` in seconds. */
export interface Point {
  hm: number;
  t: number;
}

/** A stretch driven at one constant average speed. */
export interface Segment {
  fromKm: number;
  toKm: number;
  speedKmh: number;
}

/** A cell whose scanned value disagrees with the reconstructed schedule. */
export interface Mismatch {
  km: number;
  /** Seconds as read from the photo. */
  observed: number;
  /** Seconds according to the fitted segments. */
  expected: number;
}

export interface SolveResult {
  segments: Segment[];
  /** Distance of the last readable cell, in km. */
  routeEndKm: number;
  /** Cells that took part in the fit. */
  cellsChecked: number;
  /** Cells the fitted schedule cannot explain — almost always scan errors. */
  mismatches: Mismatch[];
  /** Cells discarded before fitting because they broke monotonicity. */
  discarded: Point[];
  /** True when every scanned cell agrees with the fitted schedule. */
  exact: boolean;
}
