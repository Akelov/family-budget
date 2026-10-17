import { Archive } from 'lucide-react';
import { useId, useState } from 'react';

import { errorMessage } from '@/shared/api/errors';
import { kopecksToInput, parseAmount } from '@/shared/lib/money';
import { pluralize } from '@/shared/lib/text';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { TextInput } from '@/shared/ui/TextInput';
import { useToast } from '@/shared/ui/toast/toastContext';
import type { Budget, BudgetItem } from '@/shared/types/domain';

import { archiveBudget, createBudget, updateBudget } from '../api/budgetsApi';
import { BudgetItemsTree } from './BudgetItemsTree';

export interface BudgetFormProps {
  budget?: Budget | undefined;
  onClose: () => void;
}

interface Errors {
  name?: string;
  amount?: string;
  items?: string;
}

function validate(name: string, amount: string, items: BudgetItem[]): Errors {
  const errors: Errors = {};
  if (name.trim().length === 0) errors.name = 'Введите название';
  if (parseAmount(amount) === null) errors.amount = 'Введите сумму больше 0';
  if (items.length === 0) errors.items = 'Выберите хотя бы одну категорию или подкатегорию';
  return errors;
}

/** Создание и изменение бюджета (FR-7.2). Изменение действует на все периоды. */
export function BudgetForm({ budget, onClose }: BudgetFormProps) {
  const id = useId();
  const toast = useToast();
  const [name, setName] = useState(budget?.name ?? '');
  const [amount, setAmount] = useState(budget ? kopecksToInput(budget.amount) : '');
  const [items, setItems] = useState<BudgetItem[]>(budget?.items ?? []);
  const [isAttempted, setIsAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const errors = isAttempted ? validate(name, amount, items) : {};

  async function save() {
    setIsAttempted(true);
    const kopecks = parseAmount(amount);
    if (Object.keys(validate(name, amount, items)).length > 0 || kopecks === null) return;
    setIsSaving(true);
    try {
      const input = { name, amount: kopecks, items };
      if (budget) await updateBudget(budget.id, input);
      else await createBudget(input);
      toast.show({ message: budget ? 'Бюджет изменён' : 'Бюджет создан' });
      onClose();
    } catch (error) {
      toast.show({ message: errorMessage(error), tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  async function archive() {
    if (!budget) return;
    try {
      await archiveBudget(budget.id);
      toast.show({ message: 'Бюджет перенесён в архив' });
      onClose();
    } catch (error) {
      toast.show({ message: errorMessage(error), tone: 'error' });
    }
  }

  return (
    <Modal
      title={budget ? 'Изменить бюджет' : 'Новый бюджет'}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex gap-2">
          {budget && (
            <Button
              variant="secondary"
              size="lg"
              icon={<Archive />}
              onClick={() => void archive()}
              aria-label="В архив"
            >
              <span className="hidden sm:inline">В архив</span>
            </Button>
          )}
          <Button isBlock size="lg" isLoading={isSaving} onClick={() => void save()}>
            Сохранить
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <Field id={`${id}-name`} label="Название" isRequired error={errors.name}>
            <TextInput
              id={`${id}-name`}
              data-autofocus
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              hasError={Boolean(errors.name)}
              placeholder="Например, Ежедневные траты"
            />
          </Field>
          <Field id={`${id}-amount`} label="Сумма на период, ₽" isRequired error={errors.amount}>
            <TextInput
              id={`${id}-amount`}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              hasError={Boolean(errors.amount)}
              placeholder="0"
              className="num"
            />
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-[13px] font-medium text-muted-foreground">
            <span>
              Что входит в бюджет <span className="text-destructive">*</span>
            </span>
            <span>
              {items.length} {pluralize(items.length, ['элемент', 'элемента', 'элементов'])}
            </span>
          </div>
          <BudgetItemsTree items={items} onChange={setItems} hasError={Boolean(errors.items)} />
          {errors.items && (
            <p role="alert" className="text-[13px] text-destructive">
              {errors.items}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Категория целиком включает и подкатегории, добавленные позже.
          </p>
        </div>
      </div>
    </Modal>
  );
}
