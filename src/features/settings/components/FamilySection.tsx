import { useId, useState } from 'react';

import { updateHousehold } from '@/features/household/api/householdApi';
import { useReference } from '@/features/household/hooks/referenceContext';
import { errorMessage } from '@/shared/api/errors';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { TextInput } from '@/shared/ui/TextInput';
import { useToast } from '@/shared/ui/toast/toastContext';

import { DeleteHouseholdCard } from './DeleteHouseholdCard';
import { PeriodModeFields } from './PeriodModeFields';
import { SettingsCard } from './SettingsCard';

/** Семья: название и период семьи — меняют владелец и администратор (FR-5.2). */
export function FamilySection() {
  const { household, can } = useReference();
  const toast = useToast();
  const id = useId();
  const [name, setName] = useState(household.name);
  const canEdit = can('household.edit');

  async function save(patch: Parameters<typeof updateHousehold>[0], message: string) {
    try {
      await updateHousehold(patch);
      toast.show({ message });
    } catch (error) {
      toast.show({ message: errorMessage(error), tone: 'error' });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard
        title="Семья"
        description={canEdit ? undefined : 'Изменять может владелец или администратор'}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Field id={`${id}-name`} label="Название семьи" className="flex-1">
            <TextInput
              id={`${id}-name`}
              value={name}
              maxLength={50}
              readOnly={!canEdit}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          {canEdit && (
            <Button
              variant="secondary"
              disabled={!name.trim() || name.trim() === household.name}
              onClick={() => void save({ name }, 'Название сохранено')}
            >
              Сохранить
            </Button>
          )}
        </div>
      </SettingsCard>
      <SettingsCard
        title="Период семьи"
        description="По нему считаются бюджеты на «Плане» и показываются операции тем, у кого вид «Как у семьи»."
      >
        <PeriodModeFields
          mode={household.periodMode}
          startDay={household.periodStartDay}
          isDisabled={!canEdit}
          onChange={(mode, day) =>
            void save({ periodMode: mode, periodStartDay: day }, 'Период семьи сохранён')
          }
        />
      </SettingsCard>
      <DeleteHouseholdCard />
    </div>
  );
}
