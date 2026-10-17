import { ApiError } from './errors';
import { supabase } from './supabaseClient';
import { check } from './supabaseErrors';

/*
 * Вызов серверных функций (RPC) и безопасный разбор ответа. supabase-js без сгенерированных
 * типов отдаёт данные RPC как `any`; здесь они принимаются как `unknown` и проверяются
 * по полям (правило 16 CLAUDE.md: никакого any — только unknown + сужение типа).
 */
type Row = Record<string, unknown>;

function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Вызов функции; ошибка базы превращается в ApiError с кодом. */
export async function callRpc(fn: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const { data, error } = await supabase().rpc(fn, args);
  check({ error });
  const result: unknown = data;
  return result;
}

/** Ответ функции, возвращающей таблицу, — массив строк. */
export async function rpcRows(fn: string, args: Record<string, unknown> = {}): Promise<Row[]> {
  const data = await callRpc(fn, args);
  if (!Array.isArray(data)) throw new ApiError('server');
  return data.filter(isRow);
}

/** Строковое поле строки ответа. @throws {ApiError} `server`, если поля нет */
export function str(row: Row, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') throw new ApiError('server');
  return value;
}

/** Числовое поле (суммы в копейках приходят как bigint → число JSON). */
export function num(row: Row, key: string): number {
  const value = row[key];
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  throw new ApiError('server');
}

/** Массив строк (например, id тегов операции). */
export function strArray(row: Row, key: string): string[] {
  const value = row[key];
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}
