import type { Period, TransactionType } from '@/shared/types/domain';

/** Фильтры истории (FR-3.12): разные фильтры — по «И», значения внутри — по «ИЛИ». */
export interface TransactionFilters {
  type: TransactionType | null;
  categoryIds: string[];
  subcategoryIds: string[];
  tagIds: string[];
  authorIds: string[];
}

/** Запрос истории и сводки: период, строка поиска и фильтры. */
export interface TransactionQuery {
  period: Pick<Period, 'from' | 'to'>;
  search: string;
  filters: TransactionFilters;
}

export interface Summary {
  income: number;
  expense: number;
  balance: number;
}

export const EMPTY_FILTERS: TransactionFilters = {
  type: null,
  categoryIds: [],
  subcategoryIds: [],
  tagIds: [],
  authorIds: [],
};
