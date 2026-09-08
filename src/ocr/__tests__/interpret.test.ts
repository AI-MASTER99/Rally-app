import { describe, expect, it } from 'vitest';
import { RT10_ROWS, RT10_SEGMENTS } from '../../core/__tests__/fixtures';
import { interpretSheet } from '../interpret';
import { ScannedSheetSchema, type ScannedSheet } from '../schema';

const sheet = (partial: Partial<ScannedSheet>): ScannedSheet =>
  ScannedSheetSchema.parse({
    kind: 'timetable',
    title: '',
    distanceKind: 'leg',
    rows: [],
    legs: [],
    ...partial,
  });

const RT10 = sheet({
  kind: 'timetable',
  title: 'Time Table RT 10',
  rows: RT10_ROWS.map((row, km) => {
    const cells = row.split(/\s+/);
    while (cells.length < 10) cells.push('');
    return { km, cells };
  }),
});

const ROADBOOK = sheet({
  kind: 'roadbook',
  legs: [
    { distanceMetres: 600, instruction: 'naar rechts', time: '1:11' },
    { distanceMetres: 200, instruction: 'naar links', time: '1:32' },
    { distanceMetres: 800, instruction: 'recht door', time: '2:45' },
  ],
});

describe('interpretSheet', () => {
  it('reads a time table', () => {
    const result = interpretSheet(RT10);
    expect(result.segments).toEqual(RT10_SEGMENTS);
    expect(result).toMatchObject({ routeEndKm: 6, unexplained: 0, uncertain: [] });
  });

  it('reads a road book, keeping the instructions', () => {
    const result = interpretSheet(ROADBOOK);
    expect(result.segments).toEqual([
      { fromKm: 0, toKm: 0.6, speedKmh: 30, instruction: 'naar rechts' },
      { fromKm: 0.6, toKm: 0.8, speedKmh: 34, instruction: 'naar links' },
      { fromKm: 0.8, toKm: 1.6, speedKmh: 39, instruction: 'recht door' },
    ]);
    expect(result).toMatchObject({ routeEndKm: 1.6, unexplained: 0, uncertain: [1, 2] });
  });

  it('gives both kinds the same shape of answer', () => {
    for (const result of [interpretSheet(RT10), interpretSheet(ROADBOOK)]) {
      expect(Object.keys(result).sort()).toEqual([
        'routeEndKm',
        'segments',
        'uncertain',
        'unexplained',
      ]);
    }
  });

  it('counts a road-book line it could not use', () => {
    const broken = sheet({
      kind: 'roadbook',
      legs: [...ROADBOOK.legs.slice(0, 1), { ...ROADBOOK.legs[1]!, time: '' }],
    });
    expect(interpretSheet(broken).unexplained).toBe(1);
  });

  it('reads a road book whose distances count from the start', () => {
    const cumulative = sheet({
      kind: 'roadbook',
      distanceKind: 'cumulative',
      legs: ROADBOOK.legs.map((leg, i) => ({ ...leg, distanceMetres: [600, 800, 1600][i]! })),
    });
    expect(interpretSheet(cumulative).segments).toEqual(interpretSheet(ROADBOOK).segments);
  });
});
