import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { resetDemoData, switchMember } from '@/features/household/api/householdApi';
import { useReference } from '@/features/household/hooks/referenceContext';
import { ROLE_LABELS } from '@/features/household/model/permissions';
import { errorMessage } from '@/shared/api/errors';
import { getFailMode, setFailMode } from '@/shared/api/mockDb';
import { Button } from '@/shared/ui/Button';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { useToast } from '@/shared/ui/toast/toastContext';

import { SettingsCard } from './SettingsCard';

type FailOption = 'off' | 'network' | 'server';

/**
 * Инструменты для проверки на мок-данных (до подключения Supabase в ДЗ5):
 * вход от имени другого участника, имитация ошибок сети и сервера, сброс демо-данных.
 */
export function DeveloperSection() {
  const { members, member } = useReference();
  const toast = useToast();
  const [fail, setFail] = useState<FailOption>(getFailMode() ?? 'off');

  function changeFail(value: FailOption) {
    setFailMode(value === 'off' ? null : value);
    setFail(value);
    // Баннер и данные экранов перечитывают режим при перезагрузке.
    window.location.reload();
  }

  const run = (action: Promise<void>, message: string) =>
    action
      .then(() => toast.show({ message }))
      .catch((e: unknown) => toast.show({ message: errorMessage(e), tone: 'error' }));

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard
        title="Войти как"
        description="Проверка прав разных ролей. После подключения входа (ДЗ5) этот блок исчезнет."
      >
        <div className="flex flex-wrap gap-2">
          {members
            .filter((m) => m.removedAt === null)
            .map((m) => (
              <Button
                key={m.id}
                size="sm"
                variant={m.id === member.id ? 'primary' : 'secondary'}
                onClick={() => void run(switchMember(m.id), `Вы вошли как ${m.displayName}`)}
              >
                {m.displayName} · {ROLE_LABELS[m.role]}
              </Button>
            ))}
        </div>
      </SettingsCard>
      <SettingsCard
        title="Имитация ошибок"
        description="Все запросы будут завершаться ошибкой — так проверяются состояния ошибок и повтор."
      >
        <SegmentedControl
          label="Имитация ошибок"
          options={[
            { value: 'off', label: 'Выключено' },
            { value: 'network', label: 'Нет сети' },
            { value: 'server', label: 'Ошибка 500' },
          ]}
          value={fail}
          onChange={changeFail}
        />
      </SettingsCard>
      <SettingsCard
        title="Демо-данные"
        description="Данные хранятся только в этом браузере. Сброс вернёт исходный набор операций."
      >
        <Button
          variant="secondary"
          icon={<RotateCcw />}
          onClick={() => void run(resetDemoData(), 'Демо-данные восстановлены')}
        >
          Сбросить данные
        </Button>
      </SettingsCard>
    </div>
  );
}
