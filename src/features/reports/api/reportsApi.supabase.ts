import { fetchCategories } from '@/features/categories/api/categoriesApi.supabase';
import { fetchTags } from '@/features/tags/api/tagsApi.supabase';
import { num, rpcRows, str } from '@/shared/api/supabaseRpc';
import { buildLookups, type Lookups } from '@/shared/lib/lookups';
import type { Period, TransactionType } from '@/shared/types/domain';

import { categoryRowsFromSums, subcategoryRowsFromSums, tagRowsFromSums } from '../model/aggregate';
import type { Report } from './types';

/*
 * Суммы отчётов считает сервер по всем операциям периода (`report_by_*`), а названия, цвета
 * и доли (метод наибольшего остатка) добавляет та же функция model/, что и в демо-режиме.
 */
async function lookups(): Promise<Lookups> {
  const [categories, tags] = await Promise.all([fetchCategories(), fetchTags()]);
  return buildLookups({ members: [], ...categories, tags });
}

async function sums(fn: string, args: Record<string, string>, idKey: string): Promise<Map<string, number>> {
  const rows = await rpcRows(fn, args);
  return new Map(rows.map((row) => [str(row, idKey), num(row, 'amount')]));
}

export async function fetchCategoryReport(period: Pick<Period, 'from' | 'to'>, type: TransactionType): Promise<Report> {
  const [data, ref] = await Promise.all([
    sums('report_by_category', { p_from: period.from, p_to: period.to, p_type: type }, 'category_id'),
    lookups(),
  ]);
  return categoryRowsFromSums(data, ref);
}

export async function fetchSubcategoryReport(period: Pick<Period, 'from' | 'to'>, categoryId: string): Promise<Report> {
  const [data, ref] = await Promise.all([
    sums('report_by_subcategory', { p_from: period.from, p_to: period.to, p_category_id: categoryId }, 'subcategory_id'),
    lookups(),
  ]);
  return subcategoryRowsFromSums(data, categoryId, ref);
}

export async function fetchTagReport(period: Pick<Period, 'from' | 'to'>, type: TransactionType): Promise<Report> {
  const [data, ref] = await Promise.all([
    sums('report_by_tag', { p_from: period.from, p_to: period.to, p_type: type }, 'tag_id'),
    lookups(),
  ]);
  return tagRowsFromSums(data, ref);
}
