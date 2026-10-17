import { currentScreen } from '@/shared/lib/currentScreen';
import { logClientError } from '@/shared/lib/logger';

import { ApiError, type ApiErrorCode } from './errors';

/** Ошибка, которую возвращают supabase-js и PostgREST. */
export interface SupabaseLikeError {
  code?: string | undefined;
  message?: string | undefined;
  status?: number | undefined;
}

/** SQLSTATE и коды PostgREST → коды ошибок интерфейса (ТЗ §6.1). */
const CODE_MAP: Record<string, ApiErrorCode> = {
  P0401: 'unauthorized',
  P0403: 'forbidden',
  '42501': 'forbidden',
  P0404: 'not_found',
  PGRST116: 'not_found',
  P0409: 'conflict',
  '23505': 'duplicate',
  '23503': 'has_links',
  '23514': 'validation',
  '22001': 'validation',
};

/** Сообщения базы, которые можно показать пользователю как есть (они на русском и без деталей). */
const SHOW_SERVER_MESSAGE: ReadonlySet<ApiErrorCode> = new Set([
  'validation',
  'forbidden',
  'not_found',
]);

const DUPLICATE_MESSAGES: Record<string, string> = {
  categories_unique_name: 'Такая категория уже есть',
  subcategories_unique_name: 'Такая подкатегория уже есть',
  tags_unique_name: 'Такой тег уже есть',
};

function isRussian(text: string): boolean {
  return /[а-яё]/i.test(text);
}

/**
 * Переводит ошибку Supabase в `ApiError` с понятным кодом и текстом.
 *
 * Краевые случаи: сбой сети (supabase-js отдаёт `TypeError: Failed to fetch` без кода) →
 * `network`; HTTP 5xx → `server`; неизвестный код → `server`. Технические тексты на английском
 * пользователю не показываются.
 */
export function toApiError(error: SupabaseLikeError | null | undefined): ApiError {
  if (!error) return new ApiError('server');
  const message = error.message ?? '';
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return new ApiError('network');
  }
  const code = error.code ? CODE_MAP[error.code] : undefined;
  // Неизвестный код (в том числе HTTP 5xx) — «Не удалось загрузить данные» без технических
  // подробностей. Исходный текст базы нужен разработчику, поэтому он уходит в журнал (ТЗ §6.4).
  if (!code) {
    void logClientError({
      screen: currentScreen(),
      code: `db_${error.code ?? error.status ?? 'unknown'}`,
      message: message || 'Пустой ответ сервера',
    });
    return new ApiError('server');
  }
  if (code === 'duplicate') {
    const constraint = Object.keys(DUPLICATE_MESSAGES).find((name) => message.includes(name));
    return new ApiError('duplicate', constraint ? DUPLICATE_MESSAGES[constraint] : undefined);
  }
  if (SHOW_SERVER_MESSAGE.has(code) && isRussian(message)) return new ApiError(code, message);
  return new ApiError(code);
}

/** Бросает ApiError, если запрос вернул ошибку или пустой ответ; иначе возвращает данные. */
export function unwrap<T>(result: { data: T | null; error: SupabaseLikeError | null }): T {
  if (result.error) throw toApiError(result.error);
  if (result.data === null) throw new ApiError('server');
  return result.data;
}

/** Для запросов без полезного ответа (функции `returns void`): только проверка ошибки. */
export function check(result: { error: SupabaseLikeError | null }): void {
  if (result.error) throw toApiError(result.error);
}

/**
 * Строковое поле из ответа неизвестной формы (например, строка-результат RPC).
 *
 * @throws {ApiError} `server`, если поля нет или оно не строка
 */
export function stringField(data: unknown, key: string): string {
  if (typeof data === 'object' && data !== null && key in data) {
    const value: unknown = (data as Record<string, unknown>)[key];
    if (typeof value === 'string') return value;
  }
  throw new ApiError('server');
}
