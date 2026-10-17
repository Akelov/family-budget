import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logClientError, MAX_LOGS_PER_PAGE, resetLogLimit } from './logger';

describe('logClientError', () => {
  beforeEach(() => resetLogLimit());
  afterEach(() => vi.restoreAllMocks());

  it('пишет JSON с уровнем, временем, экраном и кодом в консоль', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await logClientError({ screen: 'reports', code: 'test', message: 'Проверка' });
    const logged: unknown = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(logged).toMatchObject({
      level: 'error',
      screen: 'reports',
      code: 'test',
      message: 'Проверка',
    });
    expect(logged).toHaveProperty('time');
  });

  it('без сервера (демо и тесты) возвращает false — запись на сервер не отправлялась', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(logClientError({ screen: 's', code: 'c', message: 'm' })).resolves.toBe(false);
  });

  it('после лимита записей за страницу перестаёт логировать', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (let i = 0; i < MAX_LOGS_PER_PAGE + 5; i += 1) {
      await logClientError({ screen: 's', code: 'c', message: String(i) });
    }
    expect(spy).toHaveBeenCalledTimes(MAX_LOGS_PER_PAGE);
  });
});
