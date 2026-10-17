import { isIsoDate } from '@/shared/lib/dates';
import { categoryOfSubcategory, type Lookups } from '@/shared/lib/lookups';
import { parseAmount } from '@/shared/lib/money';
import type { TransactionType } from '@/shared/types/domain';

export const MAX_TAGS_PER_TRANSACTION = 10;
export const MAX_COMMENT_LENGTH = 500;
export const MAX_TAG_LENGTH = 30;

/** Значения формы операции в том виде, в каком их ввёл пользователь. */
export interface TransactionFormValues {
  type: TransactionType;
  amount: string;
  subcategoryId: string | null;
  date: string;
  comment: string;
  /** Названия тегов: существующие и новые вперемешку. */
  tags: string[];
}

export type TransactionFormField = 'amount' | 'subcategoryId' | 'date' | 'comment' | 'tags';
export type TransactionFormErrors = Partial<Record<TransactionFormField, string>>;

/** Порядок полей в форме — фокус переходит на первое ошибочное (ERR-1). */
export const FIELD_ORDER: readonly TransactionFormField[] = [
  'amount',
  'subcategoryId',
  'tags',
  'date',
  'comment',
];

interface ValidationContext {
  today: string;
  lookups: Lookups;
  /** Подкатегория, с которой операция была открыта на изменение: её можно оставить архивной. */
  initialSubcategoryId?: string | null;
}

function validateSubcategory(
  values: TransactionFormValues,
  ctx: ValidationContext,
): string | undefined {
  if (!values.subcategoryId) return 'Выберите подкатегорию';
  const sub = ctx.lookups.subcategoryById.get(values.subcategoryId);
  const category = categoryOfSubcategory(ctx.lookups, values.subcategoryId);
  if (!sub || !category || category.type !== values.type) return 'Выберите подкатегорию';
  const isArchived = sub.archivedAt !== null || category.archivedAt !== null;
  if (isArchived && values.subcategoryId !== ctx.initialSubcategoryId) {
    return 'Подкатегория больше недоступна, выберите другую';
  }
  return undefined;
}

function validateTags(tags: readonly string[]): string | undefined {
  if (tags.length > MAX_TAGS_PER_TRANSACTION) return 'Не более 10 тегов на операцию';
  if (tags.some((t) => t.trim().length === 0 || t.trim().length > MAX_TAG_LENGTH)) {
    return 'Название тега — от 1 до 30 символов';
  }
  return undefined;
}

/**
 * Проверяет форму операции (FR-3.2, FR-3.3, §6.3). Пустой объект — ошибок нет.
 *
 * Краевые случаи: архивная подкатегория допустима только если операция уже была с ней
 * (FR-2.6); дата «сегодня» допустима, «завтра» — нет; сумма проверяется через `parseAmount`
 * (больше 0, не более 2 знаков после запятой, не больше 9 999 999 999,99).
 *
 * @param values - значения полей
 * @param ctx - сегодняшняя дата, справочники и исходная подкатегория при изменении
 */
export function validateTransactionForm(
  values: TransactionFormValues,
  ctx: ValidationContext,
): TransactionFormErrors {
  const errors: TransactionFormErrors = {};
  if (parseAmount(values.amount) === null)
    errors.amount = 'Введите сумму больше 0 с точностью до копеек';
  const subError = validateSubcategory(values, ctx);
  if (subError) errors.subcategoryId = subError;
  if (!isIsoDate(values.date)) errors.date = 'Укажите дату';
  else if (values.date > ctx.today) errors.date = 'Дата не может быть в будущем';
  if (values.comment.length > MAX_COMMENT_LENGTH)
    errors.comment = 'Комментарий — не длиннее 500 символов';
  const tagError = validateTags(values.tags);
  if (tagError) errors.tags = tagError;
  return errors;
}

/** Первое по порядку поле с ошибкой — для перевода фокуса. */
export function firstErrorField(errors: TransactionFormErrors): TransactionFormField | undefined {
  return FIELD_ORDER.find((field) => errors[field] !== undefined);
}
