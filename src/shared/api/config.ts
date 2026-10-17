/**
 * Откуда приложение берёт данные.
 * Если заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY — настоящий сервер Supabase (ДЗ5),
 * иначе — демо-режим с мок-данными в браузере (ДЗ4). В тестах всегда мок, чтобы тесты
 * не зависели от сети и не трогали настоящую базу.
 */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const isSupabaseEnabled: boolean =
  import.meta.env.MODE !== 'test' && SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';
