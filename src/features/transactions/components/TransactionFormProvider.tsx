import { type ReactNode, useCallback, useMemo, useState } from 'react';

import type { Transaction } from '@/shared/types/domain';

import { type CreateDefaults, TransactionFormContext } from '../hooks/transactionFormContext';
import { TransactionForm } from './TransactionForm';

export interface TransactionFormProviderProps {
  children: ReactNode;
}

type FormState =
  | { kind: 'closed' }
  | { kind: 'create'; defaults?: CreateDefaults; key: number }
  | { kind: 'edit'; transaction: Transaction; key: number };

/** Держит одну форму операции на всё приложение и открывает её по запросу экранов. */
export function TransactionFormProvider({ children }: TransactionFormProviderProps) {
  const [state, setState] = useState<FormState>({ kind: 'closed' });

  const openCreate = useCallback(
    (defaults?: CreateDefaults) =>
      setState({ kind: 'create', key: Date.now(), ...(defaults ? { defaults } : {}) }),
    [],
  );
  const openEdit = useCallback(
    (transaction: Transaction) => setState({ kind: 'edit', transaction, key: Date.now() }),
    [],
  );
  const close = useCallback(() => setState({ kind: 'closed' }), []);
  const api = useMemo(() => ({ openCreate, openEdit }), [openCreate, openEdit]);

  return (
    <TransactionFormContext.Provider value={api}>
      {children}
      {state.kind === 'create' && (
        <TransactionForm key={state.key} defaults={state.defaults} onClose={close} />
      )}
      {state.kind === 'edit' && (
        <TransactionForm key={state.key} transaction={state.transaction} onClose={close} />
      )}
    </TransactionFormContext.Provider>
  );
}
