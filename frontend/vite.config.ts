import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { assertPrivateEnvironment, rejectApiQuery, resolveApiTarget } from './config/security.mjs';

export default defineConfig(({ mode }) => {
  const environment = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  assertPrivateEnvironment(environment);
  const target = resolveApiTarget(environment.DEV_API_TARGET);
  const headers = {
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };
  return {
    plugins: [react(), {
      name: 'api-without-query',
      configureServer(server) { server.middlewares.use(rejectApiQuery); },
      configurePreviewServer(server) { server.middlewares.use(rejectApiQuery); },
    }],
    envPrefix: [],
    publicDir: false,
    build: { sourcemap: false },
    server: {
      host: '127.0.0.1', port: 5173, strictPort: true, headers,
      fs: { strict: true, allow: [process.cwd()] },
      proxy: {
        '^/api(?:/|$)': {
          target, changeOrigin: false,
          rewrite: (path) => path.replace(/^\/api(?=\/|$)/, '') || '/',
          configure(proxy) {
            // Return a generic response; this handler never logs requests or credentials.
            proxy.on('error', (_error, _request, response) => {
              if ('writeHead' in response && !response.headersSent) {
                response.writeHead(502, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ error: 'api_unavailable' }));
              }
            });
          },
        },
      },
    },
    // Preview checks static assets only; production proxy belongs to S18.
    preview: { host: '127.0.0.1', port: 4173, strictPort: true, headers },
  };
});
