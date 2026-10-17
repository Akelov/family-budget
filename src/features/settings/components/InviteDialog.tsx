import { Copy } from 'lucide-react';
import { useState } from 'react';

import { appUrl } from '@/features/auth/api/authApi';
import { createInvite } from '@/features/household/api/householdApi';
import { errorMessage } from '@/shared/api/errors';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { TextInput } from '@/shared/ui/TextInput';
import { reachGoal } from '@/shared/lib/analytics';

export interface InviteDialogProps {
  onClose: () => void;
}

/** Ссылка-приглашение: одноразовая, на 7 дней, с ролью admin или member (FR-1.4). */
export function InviteDialog({ onClose }: InviteDialogProps) {
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function create() {
    setIsLoading(true);
    setError(null);
    try {
      setLink(appUrl(`invite/${await createInvite(role)}`));
      reachGoal('invite_created', { role });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
    } catch {
      // Буфер обмена недоступен — ссылку можно выделить и скопировать вручную.
      setIsCopied(false);
    }
  }

  return (
    <Modal title="Пригласить в семью" onClose={onClose}>
      <div className="flex flex-col gap-4 pt-1">
        {!link ? (
          <>
            <SegmentedControl
              label="Роль"
              options={[
                { value: 'member', label: 'Участник' },
                { value: 'admin', label: 'Администратор' },
              ]}
              value={role}
              onChange={setRole}
            />
            <p className="text-sm text-muted-foreground">
              {role === 'admin'
                ? 'Администратор может менять категории, бюджеты и чужие операции.'
                : 'Участник ведёт свои операции и видит всё в семье.'}{' '}
              Ссылка одноразовая и действует 7 дней.
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button isBlock size="lg" isLoading={isLoading} onClick={() => void create()}>
              Создать ссылку
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm">Отправьте ссылку человеку, которого приглашаете:</p>
            <TextInput
              readOnly
              value={link}
              aria-label="Ссылка-приглашение"
              onFocus={(e) => e.target.select()}
            />
            <Button isBlock size="lg" icon={<Copy />} onClick={() => void copy(link)}>
              {isCopied ? 'Скопировано' : 'Скопировать ссылку'}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
