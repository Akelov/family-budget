import { Crown, UserPlus, UserX } from 'lucide-react';

import { useState } from 'react';

import { useAuth } from '@/features/auth/hooks/authContext';
import { changeRole, removeMember } from '@/features/household/api/householdApi';
import { useReference } from '@/features/household/hooks/referenceContext';
import { ROLE_LABELS } from '@/features/household/model/permissions';
import { errorMessage } from '@/shared/api/errors';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { IconButton } from '@/shared/ui/IconButton';
import { useToast } from '@/shared/ui/toast/toastContext';
import type { Member } from '@/shared/types/domain';

import { InviteDialog } from './InviteDialog';
import { SettingsCard } from './SettingsCard';

/** Участники и роли (FR-1.6): владелец меняет роли admin ↔ member и исключает участников. */
export function MembersSection() {
  const { members, member: me, can } = useReference();
  const toast = useToast();
  const canManage = can('members.manage');
  const { isDemo } = useAuth();
  const [isInviting, setIsInviting] = useState(false);
  const active = members.filter((m) => m.removedAt === null);
  const former = members.filter((m) => m.removedAt !== null);

  const run = (action: Promise<void>, message: string) =>
    action
      .then(() => toast.show({ message }))
      .catch((e: unknown) => toast.show({ message: errorMessage(e), tone: 'error' }));

  function renderControls(m: Member) {
    if (!canManage || m.role === 'owner') {
      return <span className="text-[13px] text-muted-foreground">{ROLE_LABELS[m.role]}</span>;
    }
    return (
      <div className="flex items-center gap-1">
        <select
          aria-label={`Роль: ${m.displayName}`}
          value={m.role}
          onChange={(e) =>
            void run(
              changeRole(m.id, e.target.value === 'admin' ? 'admin' : 'member'),
              'Роль изменена',
            )
          }
          className="h-9 rounded-full border border-border bg-white px-3 text-[13px]"
        >
          <option value="admin">Администратор</option>
          <option value="member">Участник</option>
        </select>
        <IconButton
          label={`Исключить ${m.displayName}`}
          onClick={() => void run(removeMember(m.id), 'Участник исключён, его операции сохранены')}
        >
          <UserX />
        </IconButton>
      </div>
    );
  }

  return (
    <SettingsCard
      title="Участники"
      description={`${active.length} из 10`}
      actions={
        canManage ? (
          <Button
            size="sm"
            variant="secondary"
            icon={<UserPlus />}
            disabled={isDemo}
            title={isDemo ? 'Приглашения работают только с сервером' : undefined}
            onClick={() => setIsInviting(true)}
          >
            Пригласить
          </Button>
        ) : undefined
      }
    >
      {active.length === 1 && (
        <p className="mb-2 text-sm text-muted-foreground">Вы единственный участник</p>
      )}
      <ul className="divide-y divide-border">
        {active.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2.5">
            <Avatar name={m.displayName} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 truncate font-medium">
                {m.displayName}
                {m.role === 'owner' && (
                  <Crown className="size-3.5 text-warning" aria-label="Владелец" />
                )}
                {m.id === me.id && (
                  <span className="text-xs font-normal text-muted-foreground">(вы)</span>
                )}
              </span>
            </span>
            {renderControls(m)}
          </li>
        ))}
      </ul>
      {former.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Бывшие участники: {former.map((m) => m.displayName).join(', ')} — их операции сохранены.
        </p>
      )}
      {isInviting && <InviteDialog onClose={() => setIsInviting(false)} />}
    </SettingsCard>
  );
}
