/**
 * Доменные типы приложения. Совпадают с моделью данных ТЗ §3.1, но суммы — в копейках
 * (целые числа), как их возвращают RPC (§3.3).
 */

export type Role = 'owner' | 'admin' | 'member';
export type TransactionType = 'income' | 'expense';
export type PeriodMode = 'month' | 'cycle' | 'range';
export type FamilyPeriodMode = Exclude<PeriodMode, 'range'>;

/** Номер цвета палитры категорий: `cat-1` … `cat-12`. */
export type CategoryColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface Household {
  id: string;
  name: string;
  periodMode: FamilyPeriodMode;
  periodStartDay: number;
}

export interface Member {
  id: string;
  householdId: string;
  displayName: string;
  role: Role;
  /** Личный вид периода; `null` — «Как у семьи» (FR-5.3). */
  personalPeriodMode: FamilyPeriodMode | null;
  personalPeriodStartDay: number | null;
  removedAt: string | null;
}

export interface Category {
  id: string;
  type: TransactionType;
  name: string;
  color: CategoryColor;
  icon: string;
  archivedAt: string | null;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  archivedAt: string | null;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Сумма в копейках, всегда > 0; знак задаёт `type`. */
  amount: number;
  subcategoryId: string;
  date: string;
  comment: string;
  tagIds: string[];
  authorId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type BudgetItem =
  { kind: 'category'; categoryId: string } | { kind: 'subcategory'; subcategoryId: string };

export interface Budget {
  id: string;
  name: string;
  /** Лимит на период в копейках. */
  amount: number;
  items: BudgetItem[];
  archivedAt: string | null;
  createdAt: string;
}

/** Период отчёта: границы включительно в формате `YYYY-MM-DD`. */
export interface Period {
  mode: PeriodMode;
  from: string;
  to: string;
}
