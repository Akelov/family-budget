interface ClientErrorEntry {
  screen: string;
  code: string;
  message: string;
  details?: string;
}

/**
 * Логирует ошибку интерфейса в JSON (ТЗ §6.4): уровень, время, экран, код.
 * Суммы, комментарии и имена в лог не передаются — вызывающий код передаёт только техническое сообщение.
 * В ДЗ5 запись дублируется в таблицу `client_errors`, в ДЗ6 — в систему мониторинга.
 */
export function logClientError(entry: ClientErrorEntry): void {
  console.error(JSON.stringify({ level: 'error', time: new Date().toISOString(), ...entry }));
}
