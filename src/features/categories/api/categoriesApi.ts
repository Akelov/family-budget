import { isSupabaseEnabled } from '@/shared/api/config';

import * as mock from './categoriesApi.mock';
import * as remote from './categoriesApi.supabase';

/** API категорий: Supabase или мок-сервер — выбирается при запуске (см. shared/api/config.ts). */
const api = isSupabaseEnabled ? remote : mock;

export const fetchCategories = api.fetchCategories;
export const createCategory = api.createCategory;
export const updateCategory = api.updateCategory;
export const setCategoryArchived = api.setCategoryArchived;
export const deleteCategory = api.deleteCategory;
export const createSubcategory = api.createSubcategory;
export const renameSubcategory = api.renameSubcategory;
export const setSubcategoryArchived = api.setSubcategoryArchived;
export const deleteSubcategory = api.deleteSubcategory;

export type { CategoriesData, NewCategory } from './types';
