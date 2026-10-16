/** Тип операции: доход или расход */
export type TransactionType = 'income' | 'expense';

/** Одна операция в семейном бюджете */
export interface Transaction {
  id: string;
  type: TransactionType;
  /** Сумма в рублях, всегда положительное число */
  amount: number;
  category: string;
  /** Кто из членов семьи добавил операцию */
  author: string;
  /** Дата в формате ISO, например "2026-10-16" */
  date: string;
  comment?: string;
}
