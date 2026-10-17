/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// base настраивается переменной окружения, чтобы та же сборка работала и на Vercel («/»),
// и на GitHub Pages («/family-budget/»).
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, open: false },
  build: {
    rollupOptions: {
      output: {
        // React и роутер меняются реже кода приложения: отдельный файл дольше живёт в кэше браузера.
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|react-router|scheduler)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
    css: false,
    restoreMocks: true,
    // Интеграционные тесты рендерят приложение целиком; под нагрузкой CI 5 секунд по умолчанию мало.
    testTimeout: 10_000,
  },
});
