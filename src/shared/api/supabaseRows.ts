import { rublesStringToKopecks } from '@/shared/lib/money';
import type {
  Budget,
  BudgetItem,
  Category,
  CategoryColor,
  FamilyPeriodMode,
  Household,
  Member,
  Role,
  Subcategory,
  Tag,
  TransactionType,
} from '@/shared/types/domain';

/*
 * Строки таблиц Supabase (snake_case, как в базе) и перевод в доменные типы (camelCase).
 * Деньги приходят строкой (`amount::text`), чтобы не терять точность во float, и сразу
 * переводятся в копейки (правило 18 CLAUDE.md).
 */

export interface HouseholdRow {
  id: string;
  name: string;
  period_mode: FamilyPeriodMode;
  period_start_day: number;
}

export interface MemberRow {
  id: string;
  household_id: string;
  display_name: string;
  role: Role;
  personal_period_mode: FamilyPeriodMode | null;
  personal_period_start_day: number | null;
  removed_at: string | null;
}

export interface CategoryRow {
  id: string;
  type: TransactionType;
  name: string;
  color: number;
  icon: string;
  archived_at: string | null;
}

export interface SubcategoryRow {
  id: string;
  category_id: string;
  name: string;
  archived_at: string | null;
}

export interface TagRow {
  id: string;
  name: string;
}

export interface BudgetRow {
  id: string;
  name: string;
  amount: string;
  archived_at: string | null;
  created_at: string;
  budget_items: Array<{ category_id: string | null; subcategory_id: string | null }>;
}

export const MEMBER_COLUMNS =
  'id, household_id, display_name, role, personal_period_mode, personal_period_start_day, removed_at';
export const BUDGET_COLUMNS = 'id, name, amount::text, archived_at, created_at, budget_items(category_id, subcategory_id)';

export function toHousehold(row: HouseholdRow): Household {
  return { id: row.id, name: row.name, periodMode: row.period_mode, periodStartDay: row.period_start_day };
}

export function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    householdId: row.household_id,
    displayName: row.display_name,
    role: row.role,
    personalPeriodMode: row.personal_period_mode,
    personalPeriodStartDay: row.personal_period_start_day,
    removedAt: row.removed_at,
  };
}

function toColor(value: number): CategoryColor {
  return value >= 1 && value <= 12 ? (value as CategoryColor) : 12;
}

export function toCategory(row: CategoryRow): Category {
  return { id: row.id, type: row.type, name: row.name, color: toColor(row.color), icon: row.icon, archivedAt: row.archived_at };
}

export function toSubcategory(row: SubcategoryRow): Subcategory {
  return { id: row.id, categoryId: row.category_id, name: row.name, archivedAt: row.archived_at };
}

export function toTag(row: TagRow): Tag {
  return { id: row.id, name: row.name };
}

/** Элемент бюджета: ровно одно из полей заполнено (CHECK в базе). */
function toBudgetItem(row: { category_id: string | null; subcategory_id: string | null }): BudgetItem[] {
  if (row.category_id) return [{ kind: 'category', categoryId: row.category_id }];
  if (row.subcategory_id) return [{ kind: 'subcategory', subcategoryId: row.subcategory_id }];
  return [];
}

export function toBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    name: row.name,
    amount: rublesStringToKopecks(row.amount),
    items: row.budget_items.flatMap(toBudgetItem),
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}
