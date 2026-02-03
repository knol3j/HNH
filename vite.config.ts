/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProd = mode === 'production';

  return {
    base: './',
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: ['hashnhedge.com', 'www.hashnhedge.com', 'app.hashnhedge.com', 'app-production-564e.up.railway.app', 'app-production-374e.up.railway.app', '.railway.app']
    },
    preview: {
      port: 4173,
      host: '0.0.0.0',
      allowedHosts: ['hashnhedge.com', 'www.hashnhedge.com', 'app.hashnhedge.com', 'app-production-564e.up.railway.app', 'app-production-374e.up.railway.app', '.railway.app']
    },
    publicDir: 'public',
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      minify: 'esbuild',
      sourcemap: false
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.{test,spec}.{js,ts,tsx}', 'services/**/*.{test,spec}.{js,ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: ['services/**/*.ts', 'components/**/*.tsx', 'views/**/*.tsx'],
        exclude: ['**/node_modules/**', '**/dist/**']
      }
    }
  };
});
