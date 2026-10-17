import { isSupabaseEnabled } from '@/shared/api/config';

import * as mock from './reportsApi.mock';
import * as remote from './reportsApi.supabase';

/** API отчётов: Supabase или мок-сервер — выбирается при запуске. */
const api = isSupabaseEnabled ? remote : mock;

export const fetchCategoryReport = api.fetchCategoryReport;
export const fetchSubcategoryReport = api.fetchSubcategoryReport;
export const fetchTagReport = api.fetchTagReport;

export type { Report } from './types';
