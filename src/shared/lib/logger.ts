import { isSupabaseEnabled } from '@/shared/api/config';
import { supabase } from '@/shared/api/supabaseClient';

/**
 * Уровни журнала (ДЗ6, шаг 7):
 * - `info` — для сведения (проверочная запись, пользователь отменил вход через Google);
 * - `warning` — сбой, с которым сайт справился сам (повтор запроса, устаревшая вкладка);
 * - `error` — настоящая ошибка: упал экран, неизвестный ответ базы, необработанное исключение.
 */
export type LogLevel = 'info' | 'warning' | 'error';

export interface LogEntry {
  screen: string;
  code: string;
  message: string;
  details?: string;
}

/** Запись журнала в формате JSON — одинаковая в консоли браузера и в таблице `client_errors`. */
export interface LogRecord extends LogEntry {
  level: LogLevel;
  time: string;
  version: string;
}

/**
 * Не больше стольких записей в журнал за одну загрузку страницы: ошибка в цикле перерисовки
 * не должна засыпать таблицу `client_errors` тысячами одинаковых строк.
 */
export const MAX_LOGS_PER_PAGE = 20;

/** Версия сборки: первые 7 символов коммита (задаёт пайплайн), локально — `dev`. */
export const APP_VERSION: string =
  String(import.meta.env.VITE_APP_VERSION ?? '').slice(0, 7) || 'dev';

let sentCount = 0;

/** Сбрасывает счётчик записей (только для тестов). */
export function resetLogLimit(): void {
  sentCount = 0;
}

/**
 * Собирает запись журнала: уровень, время, версия и обрезанные до лимитов таблицы поля.
 *
 * @param level - уровень записи
 * @param entry - экран, код и техническое сообщение (без сумм, имён и комментариев)
 * @param now - текущее время (в тестах — подмена)
 */
export function buildLogRecord(
  level: LogLevel,
  entry: LogEntry,
  now: Date = new Date(),
): LogRecord {
  return {
    level,
    time: now.toISOString(),
    version: APP_VERSION,
    screen: entry.screen.slice(0, 50),
    code: entry.code.slice(0, 50),
    message: entry.message.slice(0, 500),
    ...(entry.details ? { details: entry.details.slice(0, 2000) } : {}),
  };
}

const CONSOLE: Record<LogLevel, (line: string) => void> = {
  info: (line) => console.info(line),
  warning: (line) => console.warn(line),
  error: (line) => console.error(line),
};

/**
 * Пишет запись в журнал: JSON-строка в консоль браузера и, если подключён сервер и пользователь
 * вошёл, строка в таблицу `client_errors` (её видно в Supabase). Сбой самой записи лога не
 * ломает интерфейс — его ошибки гасятся.
 *
 * @returns `true`, если запись сохранена на сервере
 */
export async function log(level: LogLevel, entry: LogEntry): Promise<boolean> {
  if (sentCount >= MAX_LOGS_PER_PAGE) return false;
  sentCount += 1;
  const record = buildLogRecord(level, entry);
  CONSOLE[level](JSON.stringify(record));
  if (!isSupabaseEnabled) return false;
  try {
    // Гость (страницы входа и регистрации) писать в журнал не может — это запрещено правами
    // базы. Без этой проверки отказ сам попадал в логи Postgres как «permission denied».
    const { data } = await supabase().auth.getSession();
    if (!data.session) return false;
    const { error } = await supabase().from('client_errors').insert({
      level: record.level,
      screen: record.screen,
      code: record.code,
      message: record.message,
      app_version: record.version,
    });
    return error === null;
  } catch {
    return false;
  }
}

export const logInfo = (entry: LogEntry) => log('info', entry);
export const logWarning = (entry: LogEntry) => log('warning', entry);
export const logError = (entry: LogEntry) => log('error', entry);
