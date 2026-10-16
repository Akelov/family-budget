import { toKopecks } from '@/shared/lib/money';
import { getMonthOfDate, isValidMonth } from '@/shared/lib/month';
import type { Transaction } from '@/shared/lib/types';

import { normalizeCategory } from './category';

/**
 * Суммирует расходы за месяц по категориям.
 *
 * Учитываются только операции `expense`, дата которых попадает в `month`.
 * Доходы не уменьшают траты категории: лимит — это ограничение на расходы.
 * Категории сопоставляются через `normalizeCategory` (trim + нижний регистр).
 *
 * Некорректная учитываемая операция (дата, сумма, пустая категория) приводит
 * к ошибке, а не пропускается: молча потерянная трата исказила бы остаток лимита.
 * Доходы и расходы других месяцев не валидируются — на результат они не влияют.
 *
 * @param transactions - операции семьи (любых типов и месяцев)
 * @param month - расчётный месяц в формате `YYYY-MM`
 * @returns `Map` «нормализованная категория → сумма расходов в копейках»;
 *   категории без расходов в месяце в `Map` отсутствуют, пустой вход — пустой `Map`
 * @throws {RangeError} если месяц некорректен или учитываемая операция содержит
 *   некорректную дату, сумму или пустую категорию
 */
export function sumExpensesByCategory(
  transactions: readonly Transaction[],
  month: string,
): Map<string, number> {
  if (!isValidMonth(month)) {
    throw new RangeError(`Некорректный месяц: ${month}`);
  }
  return transactions
    .filter((transaction) => transaction.type === 'expense')
    .filter((transaction) => getMonthOfDate(transaction.date) === month)
    .reduce((totals, transaction) => {
      const key = normalizeCategory(transaction.category);
      const total = (totals.get(key) ?? 0) + toKopecks(transaction.amount);
      if (!Number.isSafeInteger(total)) {
        throw new RangeError(`Сумма расходов по категории «${key}» слишком велика`);
      }
      // Map создан внутри reduce и наружу до возврата не уходит — мутация локальна
      return totals.set(key, total);
    }, new Map<string, number>());
}
