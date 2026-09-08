import type { Segment } from '../core';
import { km } from './format';

/**
 * The deliverable.
 *
 * A time table yields anonymous stretches, so it reads best as a table. A road
 * book yields one stretch per printed instruction, and there the instruction is
 * what the crew navigates by — so it leads, with the speed beside it.
 */
export function SpeedTable({
  segments,
  uncertain = [],
}: {
  segments: Segment[];
  uncertain?: number[];
}) {
  const unsure = new Set(uncertain);

  if (segments.some((segment) => segment.instruction)) {
    return (
      <ol className="legs">
        {segments.map((segment, index) => (
          <li key={segment.fromKm}>
            <div className="leg-text">
              <span className="leg-instruction">{segment.instruction}</span>
              <span className="leg-range">
                {km(segment.fromKm)} – {km(segment.toKm)} km
              </span>
            </div>
            <span className="speed">
              {unsure.has(index) && <span className="about">±</span>}
              {segment.speedKmh}
              <span className="unit"> km/u</span>
            </span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <table className="speeds">
      <thead>
        <tr>
          <th scope="col">Van km</th>
          <th scope="col">Tot km</th>
          <th scope="col">Gem. snelheid</th>
        </tr>
      </thead>
      <tbody>
        {segments.map((segment) => (
          <tr key={segment.fromKm}>
            <td>{km(segment.fromKm)}</td>
            <td>{km(segment.toKm)}</td>
            <td className="speed">
              {segment.speedKmh}
              <span className="unit"> km/u</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
