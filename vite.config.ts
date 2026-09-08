import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Serve `api/ocr.ts` from the Vite dev server so `npm run dev` behaves like the
 * deployed site. In production the same file runs as a serverless function.
 */
function devApiPlugin(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/ocr', async (req, res) => {
        try {
          const { default: handler } = await server.ssrLoadModule('/api/ocr.ts');

          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);

          const response: Response = await handler(
            new Request(`http://localhost${req.url ?? '/'}`, {
              method: req.method,
              headers: req.headers as HeadersInit,
              body: chunks.length ? Buffer.concat(chunks) : undefined,
            }),
          );

          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          console.error(error);
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'Dev API route crashed. See the terminal.' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Make ANTHROPIC_API_KEY from .env.local visible to the dev API route.
  Object.assign(process.env, loadEnv(mode, process.cwd(), 'ANTHROPIC_'));

  return {
    plugins: [react(), devApiPlugin()],
    test: { environment: 'node', globals: true },
  };
});
