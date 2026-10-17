import { isSupabaseEnabled } from '@/shared/api/config';
import { supabase } from '@/shared/api/supabaseClient';

export interface ClientErrorEntry {
  screen: string;
  code: string;
  message: string;
  details?: string;
}

/**
 * Не больше стольких записей в журнал за одну загрузку страницы: ошибка в цикле перерисовки
 * не должна засыпать таблицу `client_errors` тысячами одинаковых строк.
 */
export const MAX_LOGS_PER_PAGE = 20;

let sentCount = 0;

/** Сбрасывает счётчик записей (только для тестов). */
export function resetLogLimit(): void {
  sentCount = 0;
}

/**
 * Логирует ошибку интерфейса (ТЗ §6.4): JSON в консоль (уровень, время, экран, код) и, если
 * подключён сервер, запись в таблицу `client_errors` — её видно в Table Editor Supabase.
 *
 * Суммы, комментарии и имена в лог не передаются: вызывающий код передаёт только техническое
 * сообщение. Сбой самой записи лога не должен ломать интерфейс, поэтому ошибки записи гасятся.
 *
 * @returns `true`, если запись сохранена на сервере; `false` — демо-режим, превышен лимит
 *   или сервер не принял запись
 */
export async function logClientError(entry: ClientErrorEntry): Promise<boolean> {
  if (sentCount >= MAX_LOGS_PER_PAGE) return false;
  sentCount += 1;
  console.error(JSON.stringify({ level: 'error', time: new Date().toISOString(), ...entry }));
  if (!isSupabaseEnabled) return false;
  try {
    // Гость (страницы входа и регистрации) писать в журнал не может — это запрещено правами
    // базы. Без этой проверки отказ сам попадал в логи Postgres как «permission denied».
    const { data } = await supabase().auth.getSession();
    if (!data.session) return false;
    const { error } = await supabase()
      .from('client_errors')
      .insert({
        level: 'error',
        screen: entry.screen.slice(0, 50),
        code: entry.code.slice(0, 50),
        message: entry.message.slice(0, 500),
      });
    return error === null;
  } catch {
    return false;
  }
}
