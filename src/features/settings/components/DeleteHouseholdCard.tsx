import { Trash2 } from 'lucide-react';
import { useId, useState } from 'react';

import { useAuth } from '@/features/auth/hooks/authContext';
import { deleteHousehold } from '@/features/household/api/householdApi';
import { useReference } from '@/features/household/hooks/referenceContext';
import { errorMessage } from '@/shared/api/errors';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { TextInput } from '@/shared/ui/TextInput';
import { useToast } from '@/shared/ui/toast/toastContext';

import { SettingsCard } from './SettingsCard';

/** Удаление семьи владельцем — подтверждение вводом названия (FR-1.9, §6.3). */
export function DeleteHouseholdCard() {
  const { household, can } = useReference();
  const { isDemo } = useAuth();
  const toast = useToast();
  const id = useId();
  const [confirm, setConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  if (isDemo || !can('household.delete')) return null;

  async function remove() {
    setIsDeleting(true);
    try {
      await deleteHousehold();
    } catch (e) {
      toast.show({ message: errorMessage(e), tone: 'error' });
      setIsDeleting(false);
    }
  }

  return (
    <SettingsCard
      title="Удалить семью"
      description="Удалятся все операции, категории и бюджеты — у всех участников. Отменить нельзя."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field id={id} label={`Введите название семьи: ${household.name}`} className="flex-1">
          <TextInput id={id} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Button
          variant="danger"
          icon={<Trash2 />}
          isLoading={isDeleting}
          disabled={confirm.trim() !== household.name}
          onClick={() => void remove()}
        >
          Удалить навсегда
        </Button>
      </div>
    </SettingsCard>
  );
}
