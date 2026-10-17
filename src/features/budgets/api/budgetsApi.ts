import { isSupabaseEnabled } from '@/shared/api/config';

import * as mock from './budgetsApi.mock';
import * as remote from './budgetsApi.supabase';

/** API бюджетов: Supabase или мок-сервер — выбирается при запуске. */
const api = isSupabaseEnabled ? remote : mock;

export const fetchBudgetStatuses = api.fetchBudgetStatuses;
export const createBudget = api.createBudget;
export const updateBudget = api.updateBudget;
export const archiveBudget = api.archiveBudget;

export type { BudgetInput } from './types';
