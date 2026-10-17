/** Коды ошибок API — соответствуют ситуациям ERR-1 … ERR-10 из ТЗ §6.1. */
export type ApiErrorCode =
  | 'network'
  | 'server'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'duplicate'
  | 'has_links'
  | 'validation';

/** Тексты по умолчанию (приложение B ТЗ). */
export const API_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  network: 'Нет соединения',
  server: 'Не удалось загрузить данные',
  forbidden: 'Недостаточно прав для этого действия',
  not_found: 'Операция удалена',
  conflict: 'Операция была изменена другим участником',
  duplicate: 'Такое название уже есть',
  has_links: 'Нельзя удалить: есть связанные операции. Переместите в архив',
  validation: 'Проверьте заполнение полей',
};

/** Ошибка запроса к API с кодом, по которому интерфейс выбирает поведение. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string = API_ERROR_MESSAGES[code]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/** Текст ошибки для пользователя из любого исключения. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Что-то пошло не так. Попробуйте ещё раз';
}

/** Повторять ли чтение автоматически (ERR-4: только сеть и 5xx). */
export function isRetryable(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 'network' || error.code === 'server');
}
