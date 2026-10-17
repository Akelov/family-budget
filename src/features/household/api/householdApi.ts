import { isSupabaseEnabled } from '@/shared/api/config';

import * as mock from './householdApi.mock';
import * as remote from './householdApi.supabase';

/*
 * API семьи. Реализация выбирается один раз при запуске: настоящий сервер Supabase
 * или мок-сервер (демо-режим и тесты). Компоненты и хуки не знают, какой из них работает.
 */
const api = isSupabaseEnabled ? remote : mock;

export const fetchSession = api.fetchSession;
export const updateHousehold = api.updateHousehold;
export const updateProfile = api.updateProfile;
export const changeRole = api.changeRole;
export const removeMember = api.removeMember;
export const switchMember = api.switchMember;
export const resetDemoData = api.resetDemoData;
export const createHousehold = api.createHousehold;
export const createInvite = api.createInvite;
export const acceptInvite = api.acceptInvite;
export const leaveHousehold = api.leaveHousehold;
export const deleteHousehold = api.deleteHousehold;

export type { Session } from './types';
