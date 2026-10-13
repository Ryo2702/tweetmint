import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const serverPort = process.env.PORT || loadEnv(mode, process.cwd(), '').PORT || 8787;
  return {
    plugins: [react()],
    server: {
      strictPort: true,
      proxy: { '/api': { target: `http://127.0.0.1:${serverPort}`, ws: true } },
    },
    test: {
      environment: 'node'
    }
  };
});
