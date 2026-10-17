import { createContext, useContext } from 'react';

import type { Transaction, TransactionType } from '@/shared/types/domain';

export interface CreateDefaults {
  type?: TransactionType;
  subcategoryId?: string;
}

export interface TransactionFormApi {
  openCreate: (defaults?: CreateDefaults) => void;
  openEdit: (transaction: Transaction) => void;
}

export const TransactionFormContext = createContext<TransactionFormApi | null>(null);

/** Открытие формы операции с любого экрана (кнопка «+» доступна везде, FR-3.1). */
export function useTransactionForm(): TransactionFormApi {
  const api = useContext(TransactionFormContext);
  if (!api) throw new Error('useTransactionForm нужно вызывать внутри TransactionFormProvider');
  return api;
}
