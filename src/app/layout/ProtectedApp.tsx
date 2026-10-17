import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { ReferenceDataProvider } from '@/features/household/components/ReferenceDataProvider';
import { TransactionFormProvider } from '@/features/transactions/components/TransactionFormProvider';

import { AppLayout } from './AppLayout';

/**
 * Основная часть приложения: только для вошедших, с загруженными данными семьи
 * и общей формой операции.
 */
export function ProtectedApp() {
  return (
    <RequireAuth>
      <ReferenceDataProvider>
        <TransactionFormProvider>
          <AppLayout />
        </TransactionFormProvider>
      </ReferenceDataProvider>
    </RequireAuth>
  );
}
