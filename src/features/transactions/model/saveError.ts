import { ApiError } from '@/shared/api/errors';

/** Что делать форме после ошибки сохранения (ТЗ §6.1). */
export type SaveErrorKind = 'conflict' | 'not_found' | 'retryable' | 'other';

/**
 * Классифицирует ошибку сохранения операции:
 * `conflict` — показать новые данные (ERR-8), `not_found` — закрыть форму (ERR-7),
 * `retryable` — сеть или 5xx: форма остаётся открытой с «Повторить» (ERR-2, ERR-4),
 * `other` — показать текст ошибки (валидация, нет прав).
 */
export function saveErrorKind(error: unknown): SaveErrorKind {
  if (!(error instanceof ApiError)) return 'other';
  if (error.code === 'conflict') return 'conflict';
  if (error.code === 'not_found') return 'not_found';
  if (error.code === 'network' || error.code === 'server') return 'retryable';
  return 'other';
}
