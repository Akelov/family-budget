import { RouterProvider } from 'react-router';

import { ReferenceDataProvider } from '@/features/household/components/ReferenceDataProvider';
import { TransactionFormProvider } from '@/features/transactions/components/TransactionFormProvider';
import { ToastProvider } from '@/shared/ui/toast/ToastProvider';

import { router } from './router';

/** Корень приложения: уведомления → справочники семьи → форма операции → маршруты. */
export function App() {
  return (
    <ToastProvider>
      <ReferenceDataProvider>
        <TransactionFormProvider>
          <RouterProvider router={router} />
        </TransactionFormProvider>
      </ReferenceDataProvider>
    </ToastProvider>
  );
}
