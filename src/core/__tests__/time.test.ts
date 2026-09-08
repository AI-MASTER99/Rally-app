import { describe, expect, it } from 'vitest';
import { formatTime, parseTime } from '../time';

describe('parseTime', () => {
  it('reads the table notation', () => {
    expect(parseTime('00:00.0')).toBe(0);
    expect(parseTime('00:08.6')).toBeCloseTo(8.6, 6);
    expect(parseTime('08:49.4')).toBeCloseTo(529.4, 6);
  });

  it('accepts hours and a comma as decimal separator', () => {
    expect(parseTime('1:05:30.2')).toBeCloseTo(3930.2, 6);
    expect(parseTime('08:49,4')).toBeCloseTo(529.4, 6);
    expect(parseTime('65:30.2')).toBeCloseTo(3930.2, 6);
  });

  it('returns null for blanks and nonsense', () => {
    for (const raw of ['', '   ', '-', null, undefined, 'abc', '12:75.0', '1:99:00.0']) {
      expect(parseTime(raw)).toBeNull();
    }
  });
});

describe('formatTime', () => {
  it('round-trips the table notation', () => {
    for (const raw of ['00:00.0', '00:08.6', '08:49.4', '07:07.6']) {
      expect(formatTime(parseTime(raw)!)).toBe(raw);
    }
  });

  it('adds hours past the hour mark', () => {
    expect(formatTime(3930.2)).toBe('1:05:30.2');
  });
});
