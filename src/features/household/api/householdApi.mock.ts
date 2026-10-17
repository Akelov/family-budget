import { can } from '@/features/household/model/permissions';
import { ApiError } from '@/shared/api/errors';
import { currentMember, readDb, request, resetDb, writeDb } from '@/shared/api/mockDb';
import type { FamilyPeriodMode, Household, Member, Role } from '@/shared/types/domain';
import type { Session } from './types';


/** Семья, текущий участник и список участников (включая бывших — для имён авторов). */
export function fetchSession(): Promise<Session> {
  return request(() => {
    const db = readDb();
    return { household: db.household, member: currentMember(db), members: db.members };
  });
}

/** Изменение названия и периода семьи (owner, admin). */
export function updateHousehold(
  patch: Partial<Pick<Household, 'name' | 'periodMode' | 'periodStartDay'>>,
): Promise<Household> {
  return request(() => {
    const db = readDb();
    if (!can(currentMember(db).role, 'household.edit')) throw new ApiError('forbidden');
    const name = patch.name?.trim();
    if (name !== undefined && (name.length < 1 || name.length > 50))
      throw new ApiError('validation', 'Название — от 1 до 50 символов');
    const household = { ...db.household, ...patch, ...(name !== undefined ? { name } : {}) };
    writeDb(['session'], (d) => ({ ...d, household }));
    return household;
  });
}

/** Имя и личный вид периода — участник меняет только себе (FR-5.3). */
export function updateProfile(patch: {
  displayName?: string;
  personalPeriodMode?: FamilyPeriodMode | null;
  personalPeriodStartDay?: number | null;
}): Promise<Member> {
  return request(() => {
    const db = readDb();
    const me = currentMember(db);
    const displayName = patch.displayName?.trim();
    if (displayName !== undefined && (displayName.length < 1 || displayName.length > 40)) {
      throw new ApiError('validation', 'Имя — от 1 до 40 символов');
    }
    const updated: Member = {
      ...me,
      ...patch,
      ...(displayName !== undefined ? { displayName } : {}),
    };
    writeDb(['session'], (d) => ({
      ...d,
      members: d.members.map((m) => (m.id === me.id ? updated : m)),
    }));
    return updated;
  });
}

/** Смена роли admin ↔ member (только owner; роль owner не меняется, FR-1.6). */
export function changeRole(memberId: string, role: Exclude<Role, 'owner'>): Promise<void> {
  return request(() => {
    const db = readDb();
    if (!can(currentMember(db).role, 'members.manage')) throw new ApiError('forbidden');
    const target = db.members.find((m) => m.id === memberId && m.removedAt === null);
    if (!target) throw new ApiError('not_found', 'Участник не найден');
    if (target.role === 'owner') throw new ApiError('forbidden');
    writeDb(['session'], (d) => ({
      ...d,
      members: d.members.map((m) => (m.id === memberId ? { ...m, role } : m)),
    }));
  });
}

/** Исключение участника: строка остаётся с `removedAt`, чтобы сохранить имя автора (FR-1.6, FR-1.7). */
export function removeMember(memberId: string): Promise<void> {
  return request(() => {
    const db = readDb();
    if (!can(currentMember(db).role, 'members.manage')) throw new ApiError('forbidden');
    const target = db.members.find((m) => m.id === memberId);
    if (!target || target.role === 'owner') throw new ApiError('forbidden');
    const removedAt = new Date().toISOString();
    writeDb(['session'], (d) => ({
      ...d,
      members: d.members.map((m) => (m.id === memberId ? { ...m, removedAt } : m)),
    }));
  });
}

/**
 * Демо-переключение «от чьего имени» работает приложение. В ДЗ5 заменяется входом через
 * Supabase Auth; нужно, чтобы проверить права ролей без регистрации.
 */
export function switchMember(memberId: string): Promise<void> {
  return request(() => {
    const db = readDb();
    if (!db.members.some((m) => m.id === memberId && m.removedAt === null))
      throw new ApiError('not_found', 'Участник не найден');
    writeDb(['session', 'transactions', 'budgets'], (d) => ({ ...d, currentMemberId: memberId }));
  });
}

/** Сброс демо-данных к исходному набору. */
export function resetDemoData(): Promise<void> {
  return request(() => resetDb());
}

/** Действия, которые появились с сервером (ДЗ5); в демо-режиме семья уже создана. */
export function createHousehold(): Promise<void> {
  return Promise.reject(new ApiError('forbidden', 'В демо-режиме семья уже создана'));
}

export function createInvite(): Promise<string> {
  return Promise.reject(new ApiError('forbidden', 'Приглашения работают только с сервером'));
}

export function acceptInvite(): Promise<void> {
  return Promise.reject(new ApiError('forbidden', 'Приглашения работают только с сервером'));
}

export function leaveHousehold(): Promise<void> {
  return Promise.reject(new ApiError('forbidden', 'В демо-режиме выйти из семьи нельзя'));
}

export function deleteHousehold(): Promise<void> {
  return Promise.reject(new ApiError('forbidden', 'В демо-режиме удалить семью нельзя'));
}
