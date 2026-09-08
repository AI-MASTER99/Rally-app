/**
 * GET /api/ping — does this project run functions at all?
 *
 * Deliberately imports nothing. If `/api/ocr` fails while this answers, the
 * problem is in that function's own module graph; if both fail, it is the
 * project's function setup, and no amount of editing `ocr.ts` will help.
 */
export default {
  fetch(): Response {
    return new Response(JSON.stringify({ pong: true, node: process.version }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  },
};
