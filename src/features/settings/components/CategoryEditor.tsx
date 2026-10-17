import { Archive, ArchiveRestore, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useId, useState } from 'react';

import {
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  renameSubcategory,
  setCategoryArchived,
  setSubcategoryArchived,
  updateCategory,
} from '@/features/categories/api/categoriesApi';
import { useReference } from '@/features/household/hooks/referenceContext';
import { errorMessage } from '@/shared/api/errors';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { IconButton } from '@/shared/ui/IconButton';
import { Modal } from '@/shared/ui/Modal';
import { TextInput } from '@/shared/ui/TextInput';
import type { Category, Subcategory } from '@/shared/types/domain';

import { ColorIconPicker } from './ColorIconPicker';

export interface CategoryEditorProps {
  category: Category;
  onClose: () => void;
}

/** Строка подкатегории с переименованием, архивом и удалением. */
function SubcategoryRow({
  sub,
  onError,
}: {
  sub: Subcategory;
  onError: (message: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(sub.name);
  const run = (action: Promise<void>, after?: () => void) =>
    action.then(() => after?.()).catch((e: unknown) => onError(errorMessage(e)));

  if (isEditing) {
    return (
      <li className="flex items-center gap-1 py-1.5">
        <TextInput
          aria-label="Название подкатегории"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          className="h-10"
          autoFocus
        />
        <IconButton
          label="Сохранить"
          onClick={() => void run(renameSubcategory(sub.id, name), () => setIsEditing(false))}
        >
          <Check />
        </IconButton>
        <IconButton label="Отмена" onClick={() => setIsEditing(false)}>
          <X />
        </IconButton>
      </li>
    );
  }
  const isArchived = sub.archivedAt !== null;
  return (
    <li className="flex items-center gap-1 py-1">
      <span
        className={`min-w-0 flex-1 truncate text-sm ${isArchived ? 'text-muted-foreground' : ''}`}
      >
        {sub.name}
      </span>
      {isArchived && <Badge tone="neutral">в архиве</Badge>}
      <IconButton label={`Переименовать «${sub.name}»`} onClick={() => setIsEditing(true)}>
        <Pencil />
      </IconButton>
      <IconButton
        label={isArchived ? `Восстановить «${sub.name}»` : `В архив «${sub.name}»`}
        onClick={() => void run(setSubcategoryArchived(sub.id, !isArchived))}
      >
        {isArchived ? <ArchiveRestore /> : <Archive />}
      </IconButton>
      <IconButton
        label={`Удалить «${sub.name}»`}
        onClick={() => void run(deleteSubcategory(sub.id))}
      >
        <Trash2 />
      </IconButton>
    </li>
  );
}

/** Изменение категории: название, цвет, иконка, подкатегории, архив и удаление (FR-2.3 – FR-2.5). */
export function CategoryEditor({ category, onClose }: CategoryEditorProps) {
  const { subcategories, categories } = useReference();
  const id = useId();
  // Берём актуальную версию из справочника: после изменений он перезагружается.
  const current = categories.find((c) => c.id === category.id) ?? category;
  const subs = subcategories.filter((s) => s.categoryId === current.id);
  const [name, setName] = useState(current.name);
  const [newSub, setNewSub] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isArchived = current.archivedAt !== null;

  const run = (action: Promise<unknown>, after?: () => void) => {
    setError(null);
    action.then(() => after?.()).catch((e: unknown) => setError(errorMessage(e)));
  };

  return (
    <Modal
      title={isArchived ? `${current.name} · в архиве` : 'Категория'}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={isArchived ? <ArchiveRestore /> : <Archive />}
            onClick={() => run(setCategoryArchived(current.id, !isArchived))}
          >
            {isArchived ? 'Восстановить' : 'В архив'}
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 />}
            onClick={() => run(deleteCategory(current.id), onClose)}
          >
            Удалить
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pt-1">
        <div className="flex gap-2">
          <TextInput
            aria-label="Название категории"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            variant="secondary"
            disabled={!name.trim() || name.trim() === current.name}
            onClick={() => run(updateCategory(current.id, { name }))}
          >
            Сохранить
          </Button>
        </div>
        <ColorIconPicker
          color={current.color}
          icon={current.icon}
          onChange={(color, icon) => run(updateCategory(current.id, { color, icon }))}
        />
        <div>
          <h3 className="mb-1 text-[13px] font-medium text-muted-foreground">Подкатегории</h3>
          <ul className="divide-y divide-border">
            {subs.map((sub) => (
              <SubcategoryRow key={sub.id} sub={sub} onError={setError} />
            ))}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(createSubcategory(current.id, newSub), () => setNewSub(''));
            }}
          >
            <label htmlFor={`${id}-new`} className="sr-only">
              Новая подкатегория
            </label>
            <TextInput
              id={`${id}-new`}
              value={newSub}
              maxLength={40}
              placeholder="Новая подкатегория"
              onChange={(e) => setNewSub(e.target.value)}
            />
            <Button
              type="submit"
              variant="secondary"
              icon={<Plus />}
              disabled={!newSub.trim() || isArchived}
            >
              <span className="hidden sm:inline">Добавить</span>
            </Button>
          </form>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-danger-bg px-3 py-2 text-[13px] text-danger-foreground"
          >
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Удалить можно категорию без операций и бюджетов. Иначе перенесите её в архив: она исчезнет
          из выбора, но останется в истории и отчётах.
        </p>
      </div>
    </Modal>
  );
}
