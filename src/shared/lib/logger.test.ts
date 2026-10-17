import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  APP_VERSION,
  buildLogRecord,
  log,
  logError,
  MAX_LOGS_PER_PAGE,
  resetLogLimit,
} from './logger';

describe('buildLogRecord', () => {
  it('JSON-запись: уровень, время, версия, экран, код, сообщение', () => {
    const record = buildLogRecord(
      'warning',
      { screen: 'reports', code: 'load_retry', message: 'Нет соединения' },
      new Date('2026-10-18T10:00:00Z'),
    );
    expect(record).toEqual({
      level: 'warning',
      time: '2026-10-18T10:00:00.000Z',
      version: APP_VERSION,
      screen: 'reports',
      code: 'load_retry',
      message: 'Нет соединения',
    });
  });

  it('обрезает поля до лимитов таблицы client_errors', () => {
    const record = buildLogRecord('error', {
      screen: 's'.repeat(80),
      code: 'c'.repeat(80),
      message: 'm'.repeat(900),
    });
    expect(record.screen).toHaveLength(50);
    expect(record.code).toHaveLength(50);
    expect(record.message).toHaveLength(500);
  });

  it('локальная сборка без версии — dev', () => {
    expect(APP_VERSION).toBe('dev');
  });
});

describe('log', () => {
  beforeEach(() => resetLogLimit());
  afterEach(() => vi.restoreAllMocks());

  it('уровень выбирает метод консоли: info → info, warning → warn, error → error', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await log('info', { screen: 's', code: 'a', message: 'm' });
    await log('warning', { screen: 's', code: 'b', message: 'm' });
    await logError({ screen: 's', code: 'c', message: 'm' });
    expect([info, warn, error].map((spy) => spy.mock.calls.length)).toEqual([1, 1, 1]);
    expect(JSON.parse(String(error.mock.calls[0]?.[0]))).toMatchObject({
      level: 'error',
      code: 'c',
    });
  });

  it('без сервера (демо и тесты) возвращает false', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(logError({ screen: 's', code: 'c', message: 'm' })).resolves.toBe(false);
  });

  it('после лимита записей за страницу перестаёт логировать', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (let i = 0; i < MAX_LOGS_PER_PAGE + 5; i += 1) {
      await logError({ screen: 's', code: 'c', message: String(i) });
    }
    expect(spy).toHaveBeenCalledTimes(MAX_LOGS_PER_PAGE);
  });
});
