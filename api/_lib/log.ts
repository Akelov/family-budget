/**
 * Журнал серверных функций Vercel: одна JSON-строка на событие (ДЗ6, шаг 7). Vercel собирает
 * вывод функций в Logs проекта — там их можно фильтровать по уровню и тексту.
 */
export type ServerLogLevel = 'info' | 'warning' | 'error';

export interface ServerLogRecord {
  level: ServerLogLevel;
  time: string;
  source: string;
  event: string;
  [key: string]: unknown;
}

/**
 * Формирует JSON-строку журнала.
 *
 * @param level - уровень
 * @param source - кто пишет, например `api/health`
 * @param event - что произошло, например `health_check`
 * @param data - подробности без секретов и личных данных
 * @param now - текущее время (в тестах — подмена)
 */
export function formatServerLog(
  level: ServerLogLevel,
  source: string,
  event: string,
  data: Record<string, unknown> = {},
  now: Date = new Date(),
): string {
  const record: ServerLogRecord = { ...data, level, time: now.toISOString(), source, event };
  return JSON.stringify(record);
}

/** Пишет запись в журнал функции: error → stderr, остальное → stdout. */
export function serverLog(
  level: ServerLogLevel,
  source: string,
  event: string,
  data: Record<string, unknown> = {},
): void {
  const line = formatServerLog(level, source, event, data);
  if (level === 'error') console.error(line);
  else if (level === 'warning') console.warn(line);
  else console.log(line);
}
