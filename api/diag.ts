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
  ['../src/core', () => import('../src/core')],
  ['../src/ocr/schema', () => import('../src/ocr/schema')],
  ['../src/ocr/prompt', () => import('../src/ocr/prompt')],
  ['../src/ocr/toGrid', () => import('../src/ocr/toGrid')],
  ['../src/ocr/interpret', () => import('../src/ocr/interpret')],
  ['../src/ocr/recognize', () => import('../src/ocr/recognize')],
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
