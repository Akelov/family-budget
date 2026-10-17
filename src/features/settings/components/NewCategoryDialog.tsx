import { useId, useState } from 'react';

import { createCategory } from '@/features/categories/api/categoriesApi';
import { errorMessage } from '@/shared/api/errors';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { TextInput } from '@/shared/ui/TextInput';
import type { CategoryColor, TransactionType } from '@/shared/types/domain';

import { ColorIconPicker } from './ColorIconPicker';

export interface NewCategoryDialogProps {
  type: TransactionType;
  onClose: () => void;
}

/** Новая категория — сразу с первой подкатегорией, без неё сохранить нельзя (FR-2.2). */
export function NewCategoryDialog({ type, onClose }: NewCategoryDialogProps) {
  const id = useId();
  const [name, setName] = useState('');
  const [subName, setSubName] = useState('');
  const [color, setColor] = useState<CategoryColor>(4);
  const [icon, setIcon] = useState('sparkles');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (!name.trim() || !subName.trim()) {
      setError('Укажите название категории и первой подкатегории');
      return;
    }
    setIsSaving(true);
    try {
      await createCategory({ type, name, color, icon, subcategoryName: subName });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title={type === 'expense' ? 'Новая категория расходов' : 'Новая категория доходов'}
      onClose={onClose}
      footer={
        <Button isBlock size="lg" isLoading={isSaving} onClick={() => void save()}>
          Создать
        </Button>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <Field id={`${id}-name`} label="Название" isRequired>
          <TextInput
            id={`${id}-name`}
            data-autofocus
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field
          id={`${id}-sub`}
          label="Первая подкатегория"
          isRequired
          hint="Подкатегорий можно добавить сколько угодно позже"
        >
          <TextInput
            id={`${id}-sub`}
            value={subName}
            maxLength={40}
            onChange={(e) => setSubName(e.target.value)}
          />
        </Field>
        <ColorIconPicker
          color={color}
          icon={icon}
          onChange={(c, i) => {
            setColor(c);
            setIcon(i);
          }}
        />
        {error && (
          <p role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
