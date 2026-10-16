export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Положительная сумма в рублях, до 2 знаков после запятой. Знак задаёт `type`. */
  amount: number;
  categoryId: string;
  /** Дата операции в формате `YYYY-MM-DD`. */
  date: string;
}

export interface CategoryExpense {
  categoryId: string;
  /** Сумма расходов по категории в рублях. */
  amount: number;
}

export interface MonthSummary {
  /** Месяц в формате `YYYY-MM`. */
  month: string;
  /** Сумма доходов в рублях. */
  totalIncome: number;
  /** Сумма расходов в рублях. */
  totalExpense: number;
  /** Доходы минус расходы, в рублях; может быть отрицательным. */
  balance: number;
  /** Расходы по категориям, по убыванию суммы. */
  expensesByCategory: CategoryExpense[];
}
