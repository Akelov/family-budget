import type { Transaction, TransactionType } from '@/shared/types/domain';

/** Размер порции истории (FR-3.8). */
export const PAGE_SIZE = 50;

export interface TransactionPage {
  items: Transaction[];
  /** Курсор следующей порции или `null`, если загружено всё (FR-3.8). */
  nextCursor: number | null;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  subcategoryId: string;
  date: string;
  comment: string;
  /** Названия тегов; новые создаются автоматически (FR-6.1). */
  tags: string[];
}
