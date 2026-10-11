import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createXApiHandler } from './src/server/xApi.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const xApiHandler = createXApiHandler({
    bearerToken: env.X_BEARER_TOKEN || env.X_API_BEARER_TOKEN,
    apiBaseUrl: env.X_API_BASE_URL
  });

  const xApiPlugin = {
    name: 'tweetmint-x-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/x', xApiHandler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/x', xApiHandler);
    }
  };

  return {
    plugins: [react(), xApiPlugin],
    test: {
      environment: 'node'
    }
  };
});
