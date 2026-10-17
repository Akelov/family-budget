/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// base настраивается переменной окружения, чтобы та же сборка работала и на Vercel («/»),
// и на GitHub Pages («/family-budget/»).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // Режим данных известен при сборке: true — Supabase, false — демо на мок-данных. Константа
  // подставляется в код как true/false, и сборщик выбрасывает ненужную ветку — на рабочий
  // сайт не попадает демо-режим с мок-данными (ДЗ6, шаг 8: −мок-данные из основного файла).
  const isSupabaseBuild =
    mode !== 'test' && Boolean(env.VITE_SUPABASE_URL) && Boolean(env.VITE_SUPABASE_ANON_KEY);
  return {
    base: process.env.VITE_BASE ?? '/',
    define: { __SUPABASE_ENABLED__: JSON.stringify(isSupabaseBuild) },
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
            // Supabase — самая крупная библиотека, а меняется только при обновлении версии.
            // Отдельный файл остаётся в кэше браузера между публикациями сайта.
            if (/node_modules\/@supabase\//.test(id)) return 'supabase';
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
  };
});
