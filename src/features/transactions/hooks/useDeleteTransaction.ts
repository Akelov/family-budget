import { useCallback } from 'react';

import { errorMessage } from '@/shared/api/errors';
import { useToast } from '@/shared/ui/toast/toastContext';

import { deleteTransaction, restoreTransaction } from '../api/transactionsApi';

/** Время, в течение которого можно отменить удаление (FR-3.6). */
export const UNDO_DURATION_MS = 5000;

/**
 * Удаление операции без диалога подтверждения: сразу удаляем и 5 секунд показываем
 * «Отменить» (FR-3.6). Возвращает `true`, если удаление прошло.
 */
export function useDeleteTransaction() {
  const toast = useToast();
  return useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await deleteTransaction(id);
      } catch (error) {
        toast.show({ message: errorMessage(error), tone: 'error' });
        return false;
      }
      toast.show({
        message: 'Операция удалена',
        durationMs: UNDO_DURATION_MS,
        action: {
          label: 'Отменить',
          onAction: () => {
            restoreTransaction(id).catch((error: unknown) =>
              toast.show({ message: errorMessage(error), tone: 'error' }),
            );
          },
        },
      });
      return true;
    },
    [toast],
  );
}
