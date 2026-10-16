export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Сумма в копейках (целое положительное число), чтобы избежать ошибок округления float. */
  amount: number;
  /** Дата операции в формате YYYY-MM-DD. */
  date: string;
  category: string;
}

export interface MonthSummary {
  /** Месяц в формате YYYY-MM. */
  month: string;
  totalIncome: number;
  totalExpenses: number;
  /** Доходы минус расходы; может быть отрицательным. */
  balance: number;
  /** Расходы по категориям, в копейках. */
  expensesByCategory: Record<string, number>;
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^(\d{4}-(0[1-9]|1[0-2]))-(0[1-9]|[12]\d|3[01])$/;

/**
 * Считает итоги за месяц по списку операций.
 * Операции других месяцев игнорируются. Все суммы — в копейках.
 *
 * @param transactions список операций
 * @param month месяц в формате YYYY-MM, например '2026-10'
 */
export function calculateMonthSummary(
  transactions: readonly Transaction[],
  month: string,
): MonthSummary {
  if (!MONTH_RE.test(month)) {
    throw new Error(`Некорректный месяц "${month}", ожидается формат YYYY-MM`);
  }

  let totalIncome = 0;
  let totalExpenses = 0;
  const expensesByCategory: Record<string, number> = {};

  for (const t of transactions) {
    // Дату сравниваем как строку, а не через Date, чтобы часовой пояс
    // не переносил операции 1-го/последнего числа в соседний месяц.
    const match = DATE_RE.exec(t.date);
    if (!match) {
      throw new Error(`Операция ${t.id}: некорректная дата "${t.date}", ожидается YYYY-MM-DD`);
    }
    if (!Number.isSafeInteger(t.amount) || t.amount <= 0) {
      throw new Error(`Операция ${t.id}: сумма должна быть целым положительным числом копеек`);
    }
    if (match[1] !== month) continue;

    if (t.type === 'income') {
      totalIncome += t.amount;
    } else if (t.type === 'expense') {
      totalExpenses += t.amount;
      const category = t.category.trim() || 'Без категории';
      expensesByCategory[category] = (expensesByCategory[category] ?? 0) + t.amount;
    } else {
      throw new Error(`Операция ${t.id}: неизвестный тип "${String(t.type)}"`);
    }
  }

  return {
    month,
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    expensesByCategory,
  };
}
