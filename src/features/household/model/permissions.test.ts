import { describe, expect, it } from 'vitest';

import type { Role } from '@/shared/types/domain';

import { can, canEditTransaction } from './permissions';

const ROLES: Role[] = ['owner', 'admin', 'member'];

describe('матрица прав (ТЗ §3.2)', () => {
  it('owner управляет участниками, admin и member — нет', () => {
    expect(ROLES.map((role) => can(role, 'members.manage'))).toEqual([true, false, false]);
  });

  it('категории и бюджеты — owner и admin', () => {
    expect(can('admin', 'categories.manage')).toBe(true);
    expect(can('member', 'budgets.manage')).toBe(false);
  });

  it('свою операцию меняет любой, чужую — только owner и admin', () => {
    expect(canEditTransaction('member', 'm1', 'm1')).toBe(true);
    expect(canEditTransaction('member', 'm1', 'm2')).toBe(false);
    expect(canEditTransaction('admin', 'm1', 'm2')).toBe(true);
  });
});
