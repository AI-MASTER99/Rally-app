import { parseTime } from '../time';
import type { Grid } from '../types';

/**
 * Time Table RT 10 of the Zoute Rally 2023, transcribed cell by cell from the
 * organiser's sheet. The sheet also prints the answer, which is `RT10_SEGMENTS`.
 */
export const RT10_ROWS = [
  '00:00.0 00:08.6 00:17.1 00:25.7 00:34.3 00:42.9 00:51.4 01:00.0 01:08.6 01:17.1',
  '01:25.7 01:34.3 01:42.9 01:51.4 02:00.0 02:08.6 02:17.1 02:25.7 02:34.3 02:42.9',
  '02:51.4 03:00.0 03:08.6 03:17.1 03:25.7 03:34.3 03:42.9 03:51.2 03:59.6 04:08.0',
  '04:16.3 04:24.7 04:33.1 04:41.5 04:49.8 04:58.2 05:06.6 05:15.0 05:23.3 05:31.7',
  '05:40.1 05:48.4 05:56.8 06:05.2 06:13.6 06:22.6 06:31.6 06:40.6 06:49.6 06:58.6',
  '07:07.6 07:19.6 07:31.6 07:43.6 07:55.6 08:07.6 08:15.9 08:24.3 08:32.7 08:41.0',
  '08:49.4',
];

export const RT10_SEGMENTS = [
  { fromKm: 0.0, toKm: 2.6, speedKmh: 42 },
  { fromKm: 2.6, toKm: 4.4, speedKmh: 43 },
  { fromKm: 4.4, toKm: 5.0, speedKmh: 40 },
  { fromKm: 5.0, toKm: 5.5, speedKmh: 30 },
  { fromKm: 5.5, toKm: 6.0, speedKmh: 43 },
];

export function rt10Grid(): Grid {
  return RT10_ROWS.map((row) => {
    const cells = row.split(/\s+/).map(parseTime);
    while (cells.length < 10) cells.push(null);
    return cells;
  });
}
