/** Dutch presentation helpers. */

/** `2.6` -> `"2,60"`. */
export const km = (value: number): string => value.toFixed(2).replace('.', ',');

export const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;
