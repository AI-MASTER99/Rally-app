/**
 * Road books: the same schedule, written as a list of route instructions.
 *
 *   600m naar rechts   1:11
 *   200m naar links    1:32
 *   800m recht door    2:45
 *
 * Underneath this is the same data a time table holds — distance paired with
 * the elapsed time at that distance — so it produces the same kind of answer.
 * What it does not have is the time table's redundancy. A time table spends
 * some 160 cells on a handful of segments, so a misread cell is outvoted and
 * then visible. Here every leg is decided by exactly one subtraction: there is
 * nothing to check it against, and no way to see a speed change that happens
 * in the middle of a leg.
 *
 * The one honest signal left is the printed precision. `1:11` was rounded to a
 * whole second, so on a short leg it may not pin a single whole km/h — those
 * legs are reported as uncertain rather than quietly rounded.
 */

import { parseTime, timePrecision } from './time';
import type { Segment } from './types';

/** Whether the distance column counts the leg, or the distance since the start. */
export type DistanceKind = 'leg' | 'cumulative';

export interface RoadbookLeg {
  /** The distance as printed, converted to metres. */
  distanceMetres: number;
  /** The route instruction, as printed. */
  instruction: string;
  /** Elapsed time since the start, as printed — the notation carries its precision. */
  time: string;
}

export interface RoadbookSolution {
  /** One entry per usable leg, in order. */
  segments: Segment[];
  routeEndKm: number;
  /** Indices into `segments` whose printed precision allows several whole km/h. */
  uncertain: number[];
  /** Legs that could not be used at all, by their position on the sheet. */
  skipped: number[];
}

const MIN_SPEED = 1;
const MAX_SPEED = 250;
const clampSpeed = (v: number) => Math.min(MAX_SPEED, Math.max(MIN_SPEED, v));

/** km/h covering `metres` in `seconds`. */
const speedOver = (metres: number, seconds: number) => (3.6 * metres) / seconds;

export function solveRoadbook(
  legs: RoadbookLeg[],
  distanceKind: DistanceKind = 'leg',
): RoadbookSolution {
  const segments: Segment[] = [];
  const uncertain: number[] = [];
  const skipped: number[] = [];

  // The route starts at zero distance and zero elapsed time, exactly.
  let metres = 0;
  let previousTime = 0;
  let previousPrecision = 0;

  legs.forEach((leg, index) => {
    const length =
      distanceKind === 'cumulative' ? leg.distanceMetres - metres : leg.distanceMetres;
    const time = parseTime(leg.time);

    if (time === null || !Number.isFinite(length) || length <= 0) {
      skipped.push(index);
      return;
    }
    const elapsed = time - previousTime;
    if (elapsed <= 0) {
      skipped.push(index);
      return;
    }

    // Both endpoints are rounded, so the leg's duration carries both errors.
    const tolerance = previousPrecision + timePrecision(leg.time);
    const slowest = speedOver(length, elapsed + tolerance);
    const fastest = elapsed > tolerance ? speedOver(length, elapsed - tolerance) : Infinity;
    if (Math.floor(fastest) - Math.ceil(slowest) >= 1) uncertain.push(segments.length);

    segments.push({
      fromKm: metres / 1000,
      toKm: (metres + length) / 1000,
      speedKmh: clampSpeed(Math.round(speedOver(length, elapsed))),
      instruction: leg.instruction,
    });

    metres += length;
    previousTime = time;
    previousPrecision = timePrecision(leg.time);
  });

  return { segments, routeEndKm: metres / 1000, uncertain, skipped };
}
