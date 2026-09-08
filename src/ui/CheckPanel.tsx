import { useState } from 'react';
import { formatTime, segmentsToGrid, type Grid, type SolveResult } from '../core';
import { km, plural } from './format';

/**
 * The verification view.
 *
 * The fitted schedule is rebuilt into a full table and laid over what was read
 * from the photo. Because a handful of segments are decided by well over a
 * hundred cells, a cell that disagrees is almost always a scan error rather
 * than a wrong schedule — but it is the driver who should decide that, so the
 * disagreements are shown rather than hidden.
 */
export function CheckPanel({ grid, result }: { grid: Grid; result: SolveResult }) {
  const [open, setOpen] = useState(false);
  const rebuilt = segmentsToGrid(result.segments);
  const suspect = new Set(result.mismatches.map((m) => Math.round(m.km * 10)));
  for (const point of result.discarded) suspect.add(point.hm);

  const problems = result.mismatches.length + result.discarded.length;

  return (
    <section className={`check ${problems === 0 ? 'ok' : 'warn'}`}>
      <button className="check-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="badge">{problems === 0 ? '✓' : '!'}</span>
        <span>
          {problems === 0
            ? `Alle ${result.cellsChecked} gelezen cellen kloppen met deze snelheden.`
            : `${plural(problems, 'cel wijkt', 'cellen wijken')} af van deze snelheden.`}
        </span>
        <span className="chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="check-body">
          {problems > 0 && (
            <>
              <p className="hint">
                Waarschijnlijk leesfouten in de foto: de overige {result.cellsChecked - problems}{' '}
                cellen bepalen de snelheden. Controleer deze cellen op het blad.
              </p>
              <ul className="mismatches">
                {result.mismatches.map((m) => (
                  <li key={`m${m.km}`}>
                    <strong>{km(m.km)} km</strong> gelezen {formatTime(m.observed)}, verwacht{' '}
                    {formatTime(m.expected)}
                  </li>
                ))}
                {result.discarded.map((p) => (
                  <li key={`d${p.hm}`}>
                    <strong>{km(p.hm / 10)} km</strong> gelezen {formatTime(p.t)}, loopt terug in de
                    tijd — genegeerd
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="grid-scroll">
            <table className="grid">
              <thead>
                <tr>
                  <th scope="col">km</th>
                  {Array.from({ length: 10 }, (_, i) => (
                    <th key={i} scope="col">
                      {(i / 10).toFixed(1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((row, kmIndex) => (
                  <tr key={kmIndex}>
                    <th scope="row">{kmIndex}</th>
                    {Array.from({ length: 10 }, (_, i) => {
                      const read = row?.[i] ?? null;
                      const expected = rebuilt[kmIndex]?.[i] ?? null;
                      const bad = read != null && suspect.has(kmIndex * 10 + i);
                      return (
                        <td key={i} className={bad ? 'bad' : read == null ? 'empty' : undefined}>
                          {read == null ? '·' : formatTime(read)}
                          {bad && expected != null && (
                            <span className="expected">{formatTime(expected)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
