import { isSupabaseEnabled } from '@/shared/api/config';
import { supabase } from '@/shared/api/supabaseClient';

interface ClientErrorEntry {
  screen: string;
  code: string;
  message: string;
  details?: string;
}

/**
 * Логирует ошибку интерфейса (ТЗ §6.4): JSON в консоль (уровень, время, экран, код) и, если
 * подключён сервер, запись в таблицу `client_errors` — её видно в Table Editor и в логах Supabase.
 * Суммы, комментарии и имена в лог не передаются: вызывающий код передаёт только техническое сообщение.
 * Сбой самой записи лога не должен ломать интерфейс, поэтому её ошибки игнорируются.
 */
export function logClientError(entry: ClientErrorEntry): void {
  console.error(JSON.stringify({ level: 'error', time: new Date().toISOString(), ...entry }));
  if (!isSupabaseEnabled) return;
  void supabase()
    .from('client_errors')
    .insert({ level: 'error', screen: entry.screen.slice(0, 50), code: entry.code.slice(0, 50), message: entry.message.slice(0, 500) })
    .then(
      () => undefined,
      () => undefined,
    );
}
