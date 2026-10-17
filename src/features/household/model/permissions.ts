import type { Role } from '@/shared/types/domain';

/** Действия из матрицы прав ТЗ §3.2. */
export type Action =
  | 'household.edit'
  | 'household.delete'
  | 'household.leave'
  | 'members.manage'
  | 'categories.manage'
  | 'tags.manage'
  | 'transactions.editOthers'
  | 'budgets.manage';

const MATRIX: Record<Action, readonly Role[]> = {
  'household.edit': ['owner', 'admin'],
  'household.delete': ['owner'],
  'household.leave': ['admin', 'member'],
  'members.manage': ['owner'],
  'categories.manage': ['owner', 'admin'],
  'tags.manage': ['owner', 'admin'],
  'transactions.editOthers': ['owner', 'admin'],
  'budgets.manage': ['owner', 'admin'],
};

/**
 * Разрешено ли роли действие. Интерфейс скрывает недоступное заранее; в ДЗ5 те же правила
 * дублируются политиками RLS в базе (правило 20 — UI не единственная защита).
 */
export function can(role: Role, action: Action): boolean {
  return MATRIX[action].includes(role);
}

/** Может ли участник изменить или удалить операцию: свою — всегда, чужую — owner и admin (FR-3.5). */
export function canEditTransaction(role: Role, memberId: string, authorId: string): boolean {
  return memberId === authorId || can(role, 'transactions.editOthers');
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  member: 'Участник',
};
