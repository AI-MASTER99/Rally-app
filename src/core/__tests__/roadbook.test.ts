import { describe, expect, it } from 'vitest';
import { solveRoadbook, type RoadbookLeg } from '../roadbook';
import { formatTime } from '../time';

/** The example sheet: leg lengths, elapsed time since the start. */
const EXAMPLE: RoadbookLeg[] = [
  { distanceMetres: 600, instruction: 'naar rechts', time: '1:11' },
  { distanceMetres: 200, instruction: 'naar links', time: '1:32' },
  { distanceMetres: 800, instruction: 'recht door', time: '2:45' },
];

describe('solveRoadbook', () => {
  it('turns each leg into its own stretch, keeping the instruction', () => {
    const { segments, routeEndKm } = solveRoadbook(EXAMPLE);
    expect(segments).toEqual([
      { fromKm: 0, toKm: 0.6, speedKmh: 30, instruction: 'naar rechts' },
      { fromKm: 0.6, toKm: 0.8, speedKmh: 34, instruction: 'naar links' },
      { fromKm: 0.8, toKm: 1.6, speedKmh: 39, instruction: 'recht door' },
    ]);
    expect(routeEndKm).toBe(1.6);
  });

  it('flags the legs whose printed precision allows several whole km/h', () => {
    // 200 m in 21 s ± 1 s spans 32.7 to 36 km/h; 600 m in 71 s ± 0.5 s does not
    // span a second integer.
    const { uncertain } = solveRoadbook(EXAMPLE);
    expect(uncertain).toEqual([1, 2]);
  });

  it('pins those same legs once the sheet prints tenths', () => {
    const precise = EXAMPLE.map((leg, i) => ({
      ...leg,
      time: formatTime([71.4, 92.5, 165.5][i]!),
    }));
    expect(solveRoadbook(precise).uncertain).toEqual([]);
  });

  it('reads a distance column that counts from the start', () => {
    const cumulative = EXAMPLE.map((leg, i) => ({
      ...leg,
      distanceMetres: [600, 800, 1600][i]!,
    }));
    expect(solveRoadbook(cumulative, 'cumulative').segments).toEqual(
      solveRoadbook(EXAMPLE).segments,
    );
  });

  it('agrees with the time-table solver on the same schedule', () => {
    // 1.2 km at 40 km/h, then 0.8 km at 30 km/h, printed to a tenth.
    const legs: RoadbookLeg[] = [
      { distanceMetres: 1200, instruction: 'recht door', time: formatTime(108) },
      { distanceMetres: 800, instruction: 'naar rechts', time: formatTime(108 + 96) },
    ];
    expect(solveRoadbook(legs).segments.map((s) => s.speedKmh)).toEqual([40, 30]);
    expect(solveRoadbook(legs).uncertain).toEqual([]);
  });

  it('skips a leg it cannot use rather than guessing', () => {
    const broken: RoadbookLeg[] = [
      { distanceMetres: 600, instruction: 'naar rechts', time: '1:11' },
      { distanceMetres: 200, instruction: 'naar links', time: 'onleesbaar' },
      { distanceMetres: 800, instruction: 'recht door', time: '2:45' },
    ];
    const { segments, skipped } = solveRoadbook(broken);
    expect(skipped).toEqual([1]);
    expect(segments.map((s) => s.instruction)).toEqual(['naar rechts', 'recht door']);
  });

  it('skips a leg whose time runs backwards', () => {
    const broken = EXAMPLE.map((leg, i) => (i === 1 ? { ...leg, time: '0:52' } : leg));
    expect(solveRoadbook(broken).skipped).toEqual([1]);
  });

  it('returns nothing for an empty sheet', () => {
    expect(solveRoadbook([])).toEqual({ segments: [], routeEndKm: 0, uncertain: [], skipped: [] });
  });
});
