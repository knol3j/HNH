/// <reference types="vitest" />
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('recharts')) return 'recharts';
          if (id.includes('ethers')) return 'ethers';
          if (id.includes('@google/genai')) return 'genai';
        }
      }
    }
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
});
