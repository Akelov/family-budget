/**
 * Откуда приложение берёт данные.
 * Если заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY — настоящий сервер Supabase (ДЗ5),
 * иначе — демо-режим с мок-данными в браузере (ДЗ4). В тестах всегда мок, чтобы тесты
 * не зависели от сети и не трогали настоящую базу.
 */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// Значение подставляет сборщик (vite.config.ts, define): ветку демо-режима он выбрасывает
// из рабочей сборки целиком.
export const isSupabaseEnabled: boolean = __SUPABASE_ENABLED__;
