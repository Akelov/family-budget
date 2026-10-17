import { useCallback, useMemo, useState } from 'react';

import type { Lookups } from '@/shared/lib/lookups';

import {
  firstErrorField,
  type TransactionFormErrors,
  type TransactionFormField,
  type TransactionFormValues,
  validateTransactionForm,
} from '../model/validation';

interface Options {
  initial: TransactionFormValues;
  today: string;
  lookups: Lookups;
  initialSubcategoryId: string | null;
}

/**
 * Состояние формы операции. Ошибка поля показывается после ухода с поля или после попытки
 * сохранить (ERR-1), а не на каждое нажатие клавиши.
 */
export function useTransactionFormState({
  initial,
  today,
  lookups,
  initialSubcategoryId,
}: Options) {
  const [values, setValues] = useState<TransactionFormValues>(initial);
  const [touched, setTouched] = useState<Partial<Record<TransactionFormField, boolean>>>({});
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);

  const errors = useMemo(
    () => validateTransactionForm(values, { today, lookups, initialSubcategoryId }),
    [values, today, lookups, initialSubcategoryId],
  );

  const visibleErrors: TransactionFormErrors = useMemo(() => {
    if (isSubmitAttempted) return errors;
    return Object.fromEntries(
      Object.entries(errors).filter(([field]) => touched[field as TransactionFormField]),
    );
  }, [errors, isSubmitAttempted, touched]);

  const setField = useCallback(
    <K extends keyof TransactionFormValues>(field: K, value: TransactionFormValues[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const touch = useCallback(
    (field: TransactionFormField) => setTouched((prev) => ({ ...prev, [field]: true })),
    [],
  );

  /** Помечает попытку сохранения; возвращает первое ошибочное поле или `undefined`. */
  const attemptSubmit = useCallback((): TransactionFormField | undefined => {
    setIsSubmitAttempted(true);
    return firstErrorField(errors);
  }, [errors]);

  return { values, setValues, setField, touch, errors, visibleErrors, attemptSubmit };
}
