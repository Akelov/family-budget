import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { isSupabaseEnabled, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

let client: SupabaseClient | null = null;

/**
 * Клиент Supabase. На клиенте — только публичный ключ (anon / publishable), правило 20:
 * доступ к данным ограничивают правила RLS в базе, а не секретность ключа.
 *
 * @throws {Error} если приложение запущено без настроек Supabase (демо-режим)
 */
export function supabase(): SupabaseClient {
  if (!isSupabaseEnabled) throw new Error('Supabase не настроен: приложение работает в демо-режиме');
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
