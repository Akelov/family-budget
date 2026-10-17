import { Check, Merge, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { useReference } from '@/features/household/hooks/referenceContext';
import { deleteTag, mergeTags, renameTag } from '@/features/tags/api/tagsApi';
import { errorMessage } from '@/shared/api/errors';
import { IconButton } from '@/shared/ui/IconButton';
import { TextInput } from '@/shared/ui/TextInput';
import { useToast } from '@/shared/ui/toast/toastContext';
import type { Tag } from '@/shared/types/domain';

import { SettingsCard } from './SettingsCard';

type Mode = { kind: 'view' } | { kind: 'rename'; name: string } | { kind: 'merge'; intoId: string };

/** Строка тега: переименование, объединение и удаление (FR-6.3). */
function TagRow({ tag, others }: { tag: Tag; others: Tag[] }) {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>({ kind: 'view' });
  const run = (action: Promise<void>, message: string) =>
    action
      .then(() => {
        toast.show({ message });
        setMode({ kind: 'view' });
      })
      .catch((e: unknown) => toast.show({ message: errorMessage(e), tone: 'error' }));

  if (mode.kind === 'rename') {
    return (
      <li className="flex items-center gap-1 py-1.5">
        <TextInput
          aria-label="Название тега"
          value={mode.name}
          maxLength={30}
          autoFocus
          onChange={(e) => setMode({ kind: 'rename', name: e.target.value })}
          className="h-10"
        />
        <IconButton
          label="Сохранить"
          onClick={() => void run(renameTag(tag.id, mode.name), 'Тег переименован')}
        >
          <Check />
        </IconButton>
        <IconButton label="Отмена" onClick={() => setMode({ kind: 'view' })}>
          <X />
        </IconButton>
      </li>
    );
  }
  if (mode.kind === 'merge') {
    return (
      <li className="flex flex-wrap items-center gap-2 py-1.5 text-sm">
        <span>Объединить «{tag.name}» с</span>
        <select
          aria-label="Тег, в который объединить"
          value={mode.intoId}
          onChange={(e) => setMode({ kind: 'merge', intoId: e.target.value })}
          className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-white px-2"
        >
          {others.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <IconButton
          label="Объединить"
          onClick={() => void run(mergeTags(tag.id, mode.intoId), 'Теги объединены')}
        >
          <Check />
        </IconButton>
        <IconButton label="Отмена" onClick={() => setMode({ kind: 'view' })}>
          <X />
        </IconButton>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-1 py-1">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{tag.name}</span>
      <IconButton
        label={`Переименовать «${tag.name}»`}
        onClick={() => setMode({ kind: 'rename', name: tag.name })}
      >
        <Pencil />
      </IconButton>
      {others[0] && (
        <IconButton
          label={`Объединить «${tag.name}»`}
          onClick={() => setMode({ kind: 'merge', intoId: others[0]?.id ?? '' })}
        >
          <Merge />
        </IconButton>
      )}
      <IconButton
        label={`Удалить «${tag.name}»`}
        onClick={() => void run(deleteTag(tag.id), 'Тег удалён и снят с операций')}
      >
        <Trash2 />
      </IconButton>
    </li>
  );
}

/** Теги семьи. Создаются из формы операции; здесь — управление (owner, admin). */
export function TagsSection() {
  const { tags, can } = useReference();
  const canManage = can('tags.manage');
  return (
    <SettingsCard title="Теги" description="Новые теги создаются прямо в форме операции">
      {tags.length === 0 && <p className="text-sm text-muted-foreground">Тегов пока нет</p>}
      <ul className="divide-y divide-border">
        {tags.map((tag) =>
          canManage ? (
            <TagRow key={tag.id} tag={tag} others={tags.filter((t) => t.id !== tag.id)} />
          ) : (
            <li key={tag.id} className="py-2.5 text-sm font-medium">
              {tag.name}
            </li>
          ),
        )}
      </ul>
    </SettingsCard>
  );
}
