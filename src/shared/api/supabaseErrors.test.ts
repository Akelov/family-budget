import { describe, expect, it, vi } from 'vitest';

import { resetLogLimit } from '@/shared/lib/logger';

import { ApiError } from './errors';
import { stringField, toApiError, unwrap } from './supabaseErrors';

describe('toApiError — коды Supabase → поведение интерфейса (ТЗ §6.1)', () => {
  it.each([
    ['P0401', 'unauthorized'],
    ['P0403', 'forbidden'],
    ['42501', 'forbidden'],
    ['P0404', 'not_found'],
    ['P0409', 'conflict'],
    ['23503', 'has_links'],
    ['23514', 'validation'],
  ])('%s → %s', (code, expected) => {
    expect(toApiError({ code, message: 'x' }).code).toBe(expected);
  });

  it('показывает русские сообщения базы, а английские технические — нет', () => {
    expect(toApiError({ code: '23514', message: 'Дата не может быть в будущем' }).message).toBe(
      'Дата не может быть в будущем',
    );
    expect(
      toApiError({ code: '42501', message: 'permission denied for table transactions' }).message,
    ).toBe('Недостаточно прав для этого действия');
  });

  it('уникальность → понятный текст по имени ограничения', () => {
    const error = toApiError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "tags_unique_name"',
    });
    expect(error).toMatchObject({ code: 'duplicate', message: 'Такой тег уже есть' });
  });

  it('сбой сети и неизвестные ошибки', () => {
    expect(toApiError({ message: 'TypeError: Failed to fetch' }).code).toBe('network');
    expect(toApiError({ code: 'XX000', message: 'internal' }).code).toBe('server');
    expect(toApiError(null).code).toBe('server');
  });

  it('неизвестная ошибка базы пишется в журнал с исходным текстом, пользователю — без деталей', () => {
    resetLogLimit();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = toApiError({ code: 'XX000', message: 'could not serialize access' });
    expect(error.message).toBe('Не удалось загрузить данные');
    expect(String(spy.mock.calls[0]?.[0])).toContain('db_XX000');
    expect(String(spy.mock.calls[0]?.[0])).toContain('could not serialize access');
    spy.mockRestore();
  });

  it('ожидаемые ошибки (права, дубликат) в журнал не пишутся', () => {
    resetLogLimit();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    toApiError({ code: '42501', message: 'permission denied' });
    toApiError({ code: '23505', message: 'duplicate key' });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('unwrap и stringField', () => {
  it('отдаёт данные, бросает ApiError на ошибке и пустом ответе', () => {
    expect(unwrap({ data: [1], error: null })).toEqual([1]);
    expect(() => unwrap({ data: null, error: { code: 'P0409' } })).toThrow(ApiError);
    expect(() => unwrap({ data: null, error: null })).toThrow(ApiError);
  });

  it('проверяет форму ответа RPC', () => {
    expect(stringField({ token: 'abc' }, 'token')).toBe('abc');
    expect(() => stringField({ token: 5 }, 'token')).toThrow(ApiError);
    expect(() => stringField(null, 'token')).toThrow(ApiError);
  });
});
