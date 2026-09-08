/**
 * GET /api/diag — which import breaks in the deployed environment?
 *
 * `/api/ocr` fails to load on Vercel while the same module graph bundles and
 * runs locally, so the fault is in how one of its dependencies resolves there.
 * This endpoint imports them one at a time, each in its own try/catch, and
 * reports the result — it has no static imports of its own, so it can always
 * answer even when everything it probes is broken.
 *
 * Delete it once /api/ocr is healthy.
 */

const PROBES: [name: string, load: () => Promise<unknown>][] = [
  ['zod', () => import('zod')],
  ['@anthropic-ai/sdk', () => import('@anthropic-ai/sdk')],
  ['@anthropic-ai/sdk/helpers/zod', () => import('@anthropic-ai/sdk/helpers/zod')],
  ['../src/core/index.js', () => import('../src/core/index.js')],
  ['../src/ocr/schema.js', () => import('../src/ocr/schema.js')],
  ['../src/ocr/prompt.js', () => import('../src/ocr/prompt.js')],
  ['../src/ocr/recognize.js', () => import('../src/ocr/recognize.js')],
  ['../src/ocr/schema (no extension)', () => import('../src/ocr/schema')],
];

export default {
  async fetch(): Promise<Response> {
    const results: Record<string, string> = { node: process.version };

    for (const [name, load] of PROBES) {
      try {
        const module = (await load()) as Record<string, unknown>;
        results[name] = `ok (${Object.keys(module).slice(0, 4).join(', ')})`;
      } catch (error) {
        results[name] =
          error instanceof Error ? `FAILED ${error.name}: ${error.message}` : `FAILED ${String(error)}`;
      }
    }

    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  },
};
