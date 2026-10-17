import { useId, useState } from 'react';

import { updateProfile } from '@/features/household/api/householdApi';
import { useReference } from '@/features/household/hooks/referenceContext';
import { ROLE_LABELS } from '@/features/household/model/permissions';
import { errorMessage } from '@/shared/api/errors';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { TextInput } from '@/shared/ui/TextInput';
import { useToast } from '@/shared/ui/toast/toastContext';
import type { FamilyPeriodMode } from '@/shared/types/domain';

import { PeriodModeFields } from './PeriodModeFields';
import { SettingsCard } from './SettingsCard';

/** Профиль: имя и личный вид периода — действует только на этого участника (FR-5.3). */
export function ProfileSection() {
  const { member, household } = useReference();
  const toast = useToast();
  const id = useId();
  const [name, setName] = useState(member.displayName);
  const [isSaving, setIsSaving] = useState(false);
  const isPersonal = member.personalPeriodMode !== null;

  async function save(patch: Parameters<typeof updateProfile>[0], message: string) {
    setIsSaving(true);
    try {
      await updateProfile(patch);
      toast.show({ message });
    } catch (error) {
      toast.show({ message: errorMessage(error), tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard title="Профиль">
        <div className="mb-4 flex items-center gap-3">
          <Avatar name={member.displayName} />
          <div>
            <p className="font-medium">{member.displayName}</p>
            <p className="text-[13px] text-muted-foreground">{ROLE_LABELS[member.role]}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Field id={`${id}-name`} label="Имя в семье" className="flex-1">
            <TextInput
              id={`${id}-name`}
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Button
            variant="secondary"
            isLoading={isSaving}
            disabled={name.trim() === member.displayName || !name.trim()}
            onClick={() => void save({ displayName: name }, 'Имя сохранено')}
          >
            Сохранить
          </Button>
        </div>
      </SettingsCard>
      <SettingsCard
        title="Мой вид периода"
        description="Как показывать «Операции» и «Отчёты» лично вам. На других участников и на «План» не влияет."
      >
        <div className="flex flex-col gap-3">
          <SegmentedControl
            label="Вид периода"
            options={[
              { value: 'family', label: 'Как у семьи' },
              { value: 'personal', label: 'Свой' },
            ]}
            value={isPersonal ? 'personal' : 'family'}
            onChange={(v) =>
              void save(
                v === 'family'
                  ? { personalPeriodMode: null, personalPeriodStartDay: null }
                  : { personalPeriodMode: 'month', personalPeriodStartDay: null },
                'Вид периода сохранён',
              )
            }
          />
          {isPersonal ? (
            <PeriodModeFields
              mode={member.personalPeriodMode ?? 'month'}
              startDay={member.personalPeriodStartDay ?? household.periodStartDay}
              onChange={(mode: FamilyPeriodMode, day: number) =>
                void save(
                  {
                    personalPeriodMode: mode,
                    personalPeriodStartDay: mode === 'cycle' ? day : null,
                  },
                  'Вид периода сохранён',
                )
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Сейчас:{' '}
              {household.periodMode === 'month'
                ? 'календарный месяц'
                : `цикл семьи с ${household.periodStartDay}-го числа`}
            </p>
          )}
        </div>
      </SettingsCard>
    </div>
  );
}
