import { can } from '@/features/household/model/permissions';
import { ApiError } from '@/shared/api/errors';
import { currentMember, readDb, request, writeDb } from '@/shared/api/mockDb';
import { createId } from '@/shared/lib/id';
import { buildLookups } from '@/shared/lib/lookups';
import { MAX_AMOUNT_KOPECKS } from '@/shared/lib/money';
import type { Budget, BudgetItem, Period } from '@/shared/types/domain';

import { type BudgetView, computeBudget } from '../model/budget';

export interface BudgetInput {
  name: string;
  amount: number;
  items: BudgetItem[];
}

/** `budget_status`: активные бюджеты, посчитанные за период семьи. */
export function fetchBudgetStatuses(period: Pick<Period, 'from' | 'to'>): Promise<BudgetView[]> {
  return request(() => {
    const db = readDb();
    const lookups = buildLookups(db);
    return db.budgets
      .filter((b) => b.archivedAt === null)
      .map((b) => computeBudget(b, db.transactions, period, lookups));
  });
}

function assertValid(input: BudgetInput): void {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 40)
    throw new ApiError('validation', 'Название — от 1 до 40 символов');
  if (
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    input.amount > MAX_AMOUNT_KOPECKS
  ) {
    throw new ApiError('validation', 'Введите сумму больше 0');
  }
  if (input.items.length === 0)
    throw new ApiError('validation', 'Выберите хотя бы одну категорию или подкатегорию');
}

function assertCanManage(): void {
  if (!can(currentMember(readDb()).role, 'budgets.manage')) throw new ApiError('forbidden');
}

export function createBudget(input: BudgetInput): Promise<Budget> {
  return request(() => {
    assertCanManage();
    assertValid(input);
    const budget: Budget = {
      id: createId(),
      name: input.name.trim(),
      amount: input.amount,
      items: input.items,
      archivedAt: null,
      createdAt: new Date().toISOString(),
    };
    writeDb(['budgets'], (d) => ({ ...d, budgets: [...d.budgets, budget] }));
    return budget;
  });
}

/** Изменение действует на все периоды, включая прошлые (FR-7.2). */
export function updateBudget(id: string, input: BudgetInput): Promise<void> {
  return request(() => {
    assertCanManage();
    assertValid(input);
    if (!readDb().budgets.some((b) => b.id === id))
      throw new ApiError('not_found', 'Бюджет не найден');
    writeDb(['budgets'], (d) => ({
      ...d,
      budgets: d.budgets.map((b) =>
        b.id === id
          ? { ...b, name: input.name.trim(), amount: input.amount, items: input.items }
          : b,
      ),
    }));
  });
}

export function archiveBudget(id: string): Promise<void> {
  return request(() => {
    assertCanManage();
    const archivedAt = new Date().toISOString();
    writeDb(['budgets'], (d) => ({
      ...d,
      budgets: d.budgets.map((b) => (b.id === id ? { ...b, archivedAt } : b)),
    }));
  });
}
