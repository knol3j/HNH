/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProd = mode === 'production';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: ['app.hashnhedge.com', 'app-production-564e.up.railway.app', 'app-production-374e.up.railway.app', '.railway.app']
    },
    preview: {
      port: 8080,
      host: '0.0.0.0',
      allowedHosts: ['app.hashnhedge.com', 'app-production-564e.up.railway.app', 'app-production-374e.up.railway.app', '.railway.app']
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
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
          pure_funcs: isProd ? ['console.log', 'console.info', 'console.debug'] : [],
          passes: 2
        },
        mangle: {
          safari10: true,
          properties: {
            regex: /^_/  // Mangle properties starting with underscore
          }
        },
        format: {
          comments: false
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            charts: ['recharts'],
            icons: ['lucide-react']
          },
          chunkFileNames: isProd ? 'assets/[hash].js' : 'assets/[name]-[hash].js',
          entryFileNames: isProd ? 'assets/[hash].js' : 'assets/[name]-[hash].js',
          assetFileNames: isProd ? 'assets/[hash].[ext]' : 'assets/[name]-[hash].[ext]'
        }
      },
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
