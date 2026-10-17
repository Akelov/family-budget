import { formatDayTitle } from '@/shared/lib/dates';
import type { Transaction } from '@/shared/types/domain';

import { signedAmount } from './summary';

export interface DayGroup {
  date: string;
  title: string;
  /** Итог дня в копейках со знаком. */
  total: number;
  items: Transaction[];
}

/**
 * Группирует уже отсортированные операции по дням с итогом дня (FR-3.8).
 * Порядок групп и операций внутри сохраняется.
 *
 * Один проход без копирования массивов на каждой операции: первая версия пересоздавала
 * группу при каждом добавлении (O(n²) внутри дня) — найдено при рефакторинге.
 */
export function groupByDay(transactions: readonly Transaction[]): DayGroup[] {
  const byDate = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const items = byDate.get(tx.date);
    if (items) items.push(tx);
    else byDate.set(tx.date, [tx]);
  }
  return [...byDate].map(([date, items]) => ({
    date,
    title: formatDayTitle(date),
    total: items.reduce((sum, tx) => sum + signedAmount(tx), 0),
    items,
  }));
}
