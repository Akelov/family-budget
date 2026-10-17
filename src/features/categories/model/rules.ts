import { normalizeName } from '@/shared/lib/text';
import type { Budget, Category, Subcategory, Transaction } from '@/shared/types/domain';

export const MAX_NAME_LENGTH = 40;

/**
 * Проверяет название категории или подкатегории (FR-2.7): 1–40 символов, уникально
 * в своей области без учёта регистра и пробелов по краям.
 *
 * @param name - введённое название
 * @param siblings - названия в той же области (категории того же типа или подкатегории категории)
 * @returns текст ошибки или `null`
 */
export function validateName(name: string, siblings: readonly string[]): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Введите название';
  if (trimmed.length > MAX_NAME_LENGTH) return 'Название — не длиннее 40 символов';
  if (siblings.some((s) => normalizeName(s) === normalizeName(trimmed)))
    return 'Такое название уже есть';
  return null;
}

/** Активные подкатегории категории. */
export function activeSubcategories(
  categoryId: string,
  subcategories: readonly Subcategory[],
): Subcategory[] {
  return subcategories.filter((s) => s.categoryId === categoryId && s.archivedAt === null);
}

/**
 * Можно ли удалить подкатегорию: нет операций (в том числе удалённых — их можно восстановить)
 * и ссылок из бюджетов (FR-2.5). Иначе остаётся только архив.
 */
export function isSubcategoryInUse(
  subcategoryId: string,
  transactions: readonly Transaction[],
  budgets: readonly Budget[],
): boolean {
  return (
    transactions.some((tx) => tx.subcategoryId === subcategoryId) ||
    budgets.some((b) =>
      b.items.some((i) => i.kind === 'subcategory' && i.subcategoryId === subcategoryId),
    )
  );
}

/** Можно ли удалить категорию: ни одна её подкатегория и она сама не используются. */
export function isCategoryInUse(
  category: Category,
  subcategories: readonly Subcategory[],
  transactions: readonly Transaction[],
  budgets: readonly Budget[],
): boolean {
  const usedByBudget = budgets.some((b) =>
    b.items.some((i) => i.kind === 'category' && i.categoryId === category.id),
  );
  return (
    usedByBudget ||
    subcategories.some(
      (s) => s.categoryId === category.id && isSubcategoryInUse(s.id, transactions, budgets),
    )
  );
}
