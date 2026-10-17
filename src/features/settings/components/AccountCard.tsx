import { LogOut } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/features/auth/hooks/authContext';
import { leaveHousehold } from '@/features/household/api/householdApi';
import { useReference } from '@/features/household/hooks/referenceContext';
import { errorMessage } from '@/shared/api/errors';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/toast/toastContext';

import { SettingsCard } from './SettingsCard';

/** Аккаунт: email, выход из аккаунта и выход из семьи для admin и member (FR-1.8). */
export function AccountCard() {
  const { email, isDemo, signOut } = useAuth();
  const { can } = useReference();
  const toast = useToast();
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);
  if (isDemo) return null;

  async function leave() {
    try {
      await leaveHousehold();
    } catch (e) {
      toast.show({ message: errorMessage(e), tone: 'error' });
    }
  }

  return (
    <SettingsCard title="Аккаунт" description={email ?? undefined}>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={<LogOut />} onClick={() => void signOut()}>
          Выйти из аккаунта
        </Button>
        {can('household.leave') &&
          (isConfirmingLeave ? (
            <>
              <Button variant="danger" onClick={() => void leave()}>
                Да, выйти из семьи
              </Button>
              <Button variant="ghost" onClick={() => setIsConfirmingLeave(false)}>
                Отмена
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setIsConfirmingLeave(true)}>
              Выйти из семьи
            </Button>
          ))}
      </div>
      {isConfirmingLeave && (
        <p className="mt-3 text-sm text-muted-foreground">Ваши операции останутся в семье с пометкой «бывший участник».</p>
      )}
    </SettingsCard>
  );
}
