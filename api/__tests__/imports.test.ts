import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * Vercel does not bundle: it compiles each file separately and lets Node
 * resolve the imports at runtime. Node's ESM resolver needs an explicit file
 * extension and does not resolve a directory to its index, so
 * `from '../src/ocr/schema'` — which Vite and Vitest both accept — fails on
 * the deployed function with "Cannot find module".
 *
 * Nothing local catches that: the type checker, the tests and the dev server
 * all resolve bundler-style. This walks the functions' real import graph and
 * insists every relative specifier is one Node can resolve.
 */

const ROOT = resolve(import.meta.dirname, '../..');
/** Deliberately probes a specifier Node cannot resolve; temporary. */
const EXCLUDED = new Set(['api/diag.ts']);

const SPECIFIER = /(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;

function specifiersIn(file: string): string[] {
  let source: string;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    // An unresolvable target is the very failure under test; recording the
    // specifier that led here is the useful part, so stop rather than throw.
    return [];
  }
  return [...source.matchAll(SPECIFIER)].map((match) => match[1]!);
}

/** Every file the deployed functions reach, and the specifiers used to get there. */
function walk(): { file: string; specifier: string }[] {
  const entrypoints = readdirSync(join(ROOT, 'api'))
    .filter((name) => name.endsWith('.ts'))
    .map((name) => join('api', name))
    .filter((path) => !EXCLUDED.has(path));

  const seen = new Set<string>();
  const queue = [...entrypoints];
  const relatives: { file: string; specifier: string }[] = [];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    for (const specifier of specifiersIn(join(ROOT, file))) {
      if (!specifier.startsWith('.')) continue;
      relatives.push({ file, specifier });

      const target = relative(ROOT, resolve(dirname(join(ROOT, file)), specifier)).replace(
        /\.js$/,
        '.ts',
      );
      queue.push(target);
    }
  }
  return relatives;
}

describe('the deployed functions', () => {
  const relatives = walk();

  it('reach code outside the api directory', () => {
    // Guards the guard: if the walk stops finding anything, it proves nothing.
    expect(relatives.some(({ specifier }) => specifier.includes('../src/'))).toBe(true);
  });

  it('import every relative module with an extension Node can resolve', () => {
    const bare = relatives
      .filter(({ specifier }) => !specifier.endsWith('.js'))
      .map(({ file, specifier }) => `${file} imports '${specifier}'`);
    expect(bare).toEqual([]);
  });
});
