import type { Segment } from '../core';
import { km } from './format';

/** The deliverable: the small summary table printed under the sheet. */
export function SpeedTable({ segments }: { segments: Segment[] }) {
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
