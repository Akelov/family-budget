import { ApiError } from '@/shared/api/errors';
import { emitChange } from '@/shared/api/events';
import { supabase } from '@/shared/api/supabaseClient';
import { check, stringField, unwrap } from '@/shared/api/supabaseErrors';
import {
  type HouseholdRow,
  MEMBER_COLUMNS,
  type MemberRow,
  toHousehold,
  toMember,
} from '@/shared/api/supabaseRows';
import type { FamilyPeriodMode, Household, Member, Role } from '@/shared/types/domain';

import type { Session } from './types';

async function currentUserId(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new ApiError('unauthorized');
  return id;
}

/**
 * Семья, текущий участник и все участники. Если пользователь вошёл, но ещё не состоит
 * в семье, — ошибка `no_household`: интерфейс покажет экран «Создать семью» (FR-1.2).
 */
export async function fetchSession(): Promise<Session> {
  const sb = supabase();
  const userId = await currentUserId();
  const me = unwrap(
    await sb
      .from('members')
      .select(MEMBER_COLUMNS)
      .eq('user_id', userId)
      .is('removed_at', null)
      .overrideTypes<MemberRow[], { merge: false }>(),
  )[0];
  if (!me) throw new ApiError('no_household');
  const [householdRows, memberRows] = await Promise.all([
    sb.from('households').select('id, name, period_mode, period_start_day').eq('id', me.household_id)
      .overrideTypes<HouseholdRow[], { merge: false }>(),
    sb.from('members').select(MEMBER_COLUMNS).order('created_at').overrideTypes<MemberRow[], { merge: false }>(),
  ]);
  const household = unwrap(householdRows)[0];
  if (!household) throw new ApiError('no_household');
  return { household: toHousehold(household), member: toMember(me), members: unwrap(memberRows).map(toMember) };
}

/** Создание семьи с готовым набором категорий (RPC `create_household`). */
export async function createHousehold(name: string, displayName: string): Promise<void> {
  check(await supabase().rpc('create_household', { p_name: name, p_display_name: displayName }));
  emitChange(['session', 'categories', 'tags', 'transactions', 'budgets']);
}

export async function updateHousehold(
  patch: Partial<Pick<Household, 'name' | 'periodMode' | 'periodStartDay'>>,
): Promise<Household> {
  const sb = supabase();
  const session = await fetchSession();
  const row = unwrap(
    await sb
      .from('households')
      .update({
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.periodMode !== undefined ? { period_mode: patch.periodMode } : {}),
        ...(patch.periodStartDay !== undefined ? { period_start_day: patch.periodStartDay } : {}),
      })
      .eq('id', session.household.id)
      .select('id, name, period_mode, period_start_day')
      .overrideTypes<HouseholdRow[], { merge: false }>(),
  )[0];
  // RLS не вернёт строку, если менять нельзя: так «нет прав» отличается от успеха.
  if (!row) throw new ApiError('forbidden');
  emitChange(['session']);
  return toHousehold(row);
}

export async function updateProfile(patch: {
  displayName?: string;
  personalPeriodMode?: FamilyPeriodMode | null;
  personalPeriodStartDay?: number | null;
}): Promise<Member> {
  const session = await fetchSession();
  const row = unwrap(
    await supabase()
      .from('members')
      .update({
        ...(patch.displayName !== undefined ? { display_name: patch.displayName.trim() } : {}),
        ...(patch.personalPeriodMode !== undefined ? { personal_period_mode: patch.personalPeriodMode } : {}),
        ...(patch.personalPeriodStartDay !== undefined ? { personal_period_start_day: patch.personalPeriodStartDay } : {}),
      })
      .eq('id', session.member.id)
      .select(MEMBER_COLUMNS)
      .overrideTypes<MemberRow[], { merge: false }>(),
  )[0];
  if (!row) throw new ApiError('forbidden');
  emitChange(['session']);
  return toMember(row);
}

async function updateMember(memberId: string, values: Record<string, string>): Promise<void> {
  const rows = unwrap(
    await supabase().from('members').update(values).eq('id', memberId).select('id')
      .overrideTypes<Array<{ id: string }>, { merge: false }>(),
  );
  if (rows.length === 0) throw new ApiError('forbidden');
  emitChange(['session']);
}

/** Смена роли admin ↔ member (только owner — проверяют RLS и триггер-страж). */
export function changeRole(memberId: string, role: Exclude<Role, 'owner'>): Promise<void> {
  return updateMember(memberId, { role });
}

/** Исключение участника: операции остаются, автор — «бывший участник» (FR-1.6, FR-1.7). */
export function removeMember(memberId: string): Promise<void> {
  return updateMember(memberId, { removed_at: new Date().toISOString() });
}

/** Ссылка-приглашение (только owner). Возвращает токен. */
export async function createInvite(role: Exclude<Role, 'owner'>): Promise<string> {
  const { data, error } = await supabase().rpc('create_invite', { p_role: role });
  check({ error });
  return stringField(data, 'token');
}

/** Принять приглашение по токену из ссылки (FR-1.5). */
export async function acceptInvite(token: string, displayName: string): Promise<void> {
  check(await supabase().rpc('accept_invite', { p_token: token, p_display_name: displayName }));
  emitChange(['session', 'categories', 'tags', 'transactions', 'budgets']);
}

/** Выйти из семьи — admin и member (FR-1.8). */
export async function leaveHousehold(): Promise<void> {
  check(await supabase().rpc('leave_household'));
  emitChange(['session']);
}

/** Удалить семью со всеми данными — только owner (FR-1.9). */
export async function deleteHousehold(): Promise<void> {
  check(await supabase().rpc('delete_household'));
  emitChange(['session']);
}

/** В режиме Supabase «войти как» нет — вход настоящий. */
export function switchMember(): Promise<void> {
  return Promise.reject(new ApiError('forbidden', 'Доступно только в демо-режиме'));
}

export function resetDemoData(): Promise<void> {
  return Promise.reject(new ApiError('forbidden', 'Доступно только в демо-режиме'));
}
