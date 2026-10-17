import { ClipboardCheck } from 'lucide-react';
import { useState } from 'react';

import { logClientError } from '@/shared/lib/logger';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/toast/toastContext';

import { SettingsCard } from './SettingsCard';

/**
 * Проверка журнала ошибок (ТЗ §6.4): отправляет на сервер проверочную запись, которую потом
 * видно в Supabase (таблица `client_errors`). Пользовательских данных в записи нет.
 */
export function LogCheckCard() {
  const toast = useToast();
  const [isSending, setIsSending] = useState(false);

  async function sendTestEntry() {
    setIsSending(true);
    const isSaved = await logClientError({
      screen: 'settings',
      code: 'test_entry',
      message: 'Проверочная запись журнала ошибок',
    });
    setIsSending(false);
    toast.show(
      isSaved
        ? { message: 'Запись отправлена в журнал ошибок' }
        : { message: 'Не удалось записать в журнал', tone: 'error' },
    );
  }

  return (
    <SettingsCard
      title="Журнал ошибок"
      description="Ошибки сайта записываются на сервер, чтобы разработчик мог их найти. Кнопка отправляет проверочную запись."
    >
      <Button
        variant="secondary"
        icon={<ClipboardCheck />}
        isLoading={isSending}
        onClick={() => void sendTestEntry()}
      >
        Отправить проверочную запись
      </Button>
    </SettingsCard>
  );
}
