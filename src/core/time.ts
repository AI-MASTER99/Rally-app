/** Parsing and formatting of time-table cells (`MM:SS.S`, or `H:MM:SS.S`). */

const TIME_RE = /^(?:(\d{1,2}):)?(\d{1,3}):(\d{1,2})(?:[.,](\d{1,2}))?$/;

/**
 * Parse a cell as seconds. Accepts `08:49.4`, `1:05:30.2`, `8:49,4`.
 * Returns `null` for anything that is not a time, including blank cells.
 */
export function parseTime(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const text = raw.trim().replace(/\s+/g, '');
  if (text === '' || text === '-') return null;

  const m = TIME_RE.exec(text);
  if (!m) return null;

  const [, h, a, b, frac] = m;
  // Without an hours group the pattern reads as MM:SS; with one it is H:MM:SS.
  const hours = h ? Number(h) : 0;
  const minutes = Number(a);
  const seconds = Number(b);
  if (seconds >= 60) return null;
  if (h && minutes >= 60) return null;

  const fraction = frac ? Number(frac) / 10 ** frac.length : 0;
  return hours * 3600 + minutes * 60 + seconds + fraction;
}

/** Format seconds back to the table's own notation, to one tenth. */
export function formatTime(seconds: number): string {
  const tenths = Math.round(seconds * 10);
  const t = tenths % 10;
  const total = (tenths - t) / 10;
  const s = total % 60;
  const totalMinutes = (total - s) / 60;
  const mm = totalMinutes % 60;
  const hh = (totalMinutes - mm) / 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const base = `${pad(mm)}:${pad(s)}.${t}`;
  return hh > 0 ? `${hh}:${base}` : base;
}

/** Format a distance in hectometres as the table prints it, e.g. `2.60`. */
export function formatKm(hm: number): string {
  return (hm / 10).toFixed(2);
}

