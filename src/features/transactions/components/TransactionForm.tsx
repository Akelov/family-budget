import { Trash2 } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';

import { useReference } from '@/features/household/hooks/referenceContext';
import { canEditTransaction } from '@/features/household/model/permissions';
import { errorMessage } from '@/shared/api/errors';
import { todayIso } from '@/shared/lib/dates';
import { createId } from '@/shared/lib/id';
import { authorName } from '@/shared/lib/lookups';
import { kopecksToInput, parseAmount } from '@/shared/lib/money';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { useToast } from '@/shared/ui/toast/toastContext';
import type { Transaction, TransactionType } from '@/shared/types/domain';

import {
  createTransaction,
  fetchTransaction,
  type TransactionInput,
  updateTransaction,
} from '../api/transactionsApi';
import type { CreateDefaults } from '../hooks/transactionFormContext';
import { useDeleteTransaction } from '../hooks/useDeleteTransaction';
import { useTransactionFormState } from '../hooks/useTransactionFormState';
import { saveErrorKind } from '../model/saveError';
import type { TransactionFormField, TransactionFormValues } from '../model/validation';
import { AmountInput } from './AmountInput';
import { CategoryPicker } from './CategoryPicker';
import { DateCommentFields } from './DateCommentFields';
import { SubcategoryPicker } from './SubcategoryPicker';
import { TagsInput } from './TagsInput';

export interface TransactionFormProps {
  transaction?: Transaction | undefined;
  defaults?: CreateDefaults | undefined;
  onClose: () => void;
}

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Расход' },
  { value: 'income', label: 'Доход' },
] as const;

function valuesFromTransaction(
  tx: Transaction,
  tagName: (id: string) => string | undefined,
): TransactionFormValues {
  return {
    type: tx.type,
    amount: kopecksToInput(tx.amount),
    subcategoryId: tx.subcategoryId,
    date: tx.date,
    comment: tx.comment,
    tags: tx.tagIds.flatMap((id) => tagName(id) ?? []),
  };
}

/** Форма добавления и изменения операции (FR-3.1 – FR-3.6). */
export function TransactionForm({ transaction, defaults, onClose }: TransactionFormProps) {
  const { member, categories, subcategories, tags, lookups } = useReference();
  const toast = useToast();
  const removeTransaction = useDeleteTransaction();
  const formId = useId();
  const amountRef = useRef<HTMLInputElement>(null);
  const today = todayIso();
  // id новой операции создаётся один раз при открытии формы: повтор сохранения после
  // ошибки сети отправит тот же id и не создаст дубликат (FR-3.4).
  const [id] = useState(() => transaction?.id ?? createId());
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(transaction?.updatedAt ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const isEdit = transaction !== undefined;
  const isReadOnly = isEdit && !canEditTransaction(member.role, member.id, transaction.authorId);
  const tagName = (tagId: string) => lookups.tagById.get(tagId)?.name;

  const form = useTransactionFormState({
    initial: transaction
      ? valuesFromTransaction(transaction, tagName)
      : {
          type: defaults?.type ?? 'expense',
          amount: '',
          subcategoryId: defaults?.subcategoryId ?? null,
          date: today,
          comment: '',
          tags: [],
        },
    today,
    lookups,
    initialSubcategoryId: transaction?.subcategoryId ?? null,
  });
  const { values, setField, touch, visibleErrors } = form;
  const [categoryId, setCategoryId] = useState<string | null>(
    values.subcategoryId
      ? (lookups.subcategoryById.get(values.subcategoryId)?.categoryId ?? null)
      : null,
  );

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.type === values.type && (c.archivedAt === null || c.id === categoryId),
      ),
    [categories, values.type, categoryId],
  );
  const visibleSubcategories = useMemo(
    () =>
      subcategories.filter(
        (s) =>
          s.categoryId === categoryId &&
          (s.archivedAt === null || s.id === transaction?.subcategoryId),
      ),
    [subcategories, categoryId, transaction?.subcategoryId],
  );

  function changeType(type: TransactionType) {
    if (type === values.type) return;
    setField('type', type);
    setField('subcategoryId', null);
    setCategoryId(null);
  }

  function changeCategory(nextId: string) {
    setCategoryId(nextId);
    const subs = subcategories.filter((s) => s.categoryId === nextId && s.archivedAt === null);
    // Если подкатегория одна, выбирать её вручную незачем.
    setField('subcategoryId', subs.length === 1 && subs[0] ? subs[0].id : null);
  }

  function focusField(field: TransactionFormField) {
    if (field === 'amount') amountRef.current?.focus();
    else document.getElementById(`${formId}-${field}`)?.focus();
  }

  async function reloadAfterConflict() {
    try {
      const fresh = await fetchTransaction(id);
      form.setValues(valuesFromTransaction(fresh, tagName));
      setCategoryId(lookups.subcategoryById.get(fresh.subcategoryId)?.categoryId ?? null);
      setExpectedUpdatedAt(fresh.updatedAt);
    } catch {
      onClose();
    }
  }

  async function save() {
    const invalid = form.attemptSubmit();
    if (invalid) {
      focusField(invalid);
      return;
    }
    const amount = parseAmount(values.amount);
    if (amount === null || values.subcategoryId === null) return;
    const input: TransactionInput = {
      type: values.type,
      amount,
      subcategoryId: values.subcategoryId,
      date: values.date,
      comment: values.comment,
      tags: values.tags,
    };
    setIsSaving(true);
    try {
      if (isEdit) await updateTransaction(id, expectedUpdatedAt, input);
      else await createTransaction(id, input);
      toast.show({ message: isEdit ? 'Операция изменена' : 'Операция добавлена' });
      onClose();
    } catch (error) {
      handleSaveError(error);
    } finally {
      setIsSaving(false);
    }
  }

  function handleSaveError(error: unknown) {
    const kind = saveErrorKind(error);
    if (kind === 'conflict') {
      toast.show({
        message: 'Операция была изменена другим участником. Показаны новые данные',
        tone: 'error',
      });
      void reloadAfterConflict();
    } else if (kind === 'not_found') {
      toast.show({ message: 'Операция удалена', tone: 'error' });
      onClose();
    } else if (kind === 'retryable') {
      // Форма остаётся открытой, данные не теряются; повтор отправит тот же id (ERR-2).
      toast.show({
        message: 'Нет соединения',
        tone: 'error',
        action: { label: 'Повторить', onAction: () => void save() },
      });
    } else {
      toast.show({ message: errorMessage(error), tone: 'error' });
    }
  }

  async function remove() {
    if (!transaction) return;
    if (await removeTransaction(transaction.id)) onClose();
  }

  const footer = isReadOnly ? (
    <p className="py-2 text-center text-sm text-muted-foreground">
      Изменять чужие операции могут владелец и администратор
    </p>
  ) : (
    <div className="flex gap-2">
      {isEdit && (
        <Button
          variant="danger"
          size="lg"
          icon={<Trash2 />}
          onClick={() => void remove()}
          aria-label="Удалить операцию"
        >
          <span className="hidden sm:inline">Удалить</span>
        </Button>
      )}
      <Button isBlock size="lg" isLoading={isSaving} onClick={() => void save()}>
        Сохранить
      </Button>
    </div>
  );

  return (
    <Modal
      title={isEdit ? (isReadOnly ? 'Операция' : 'Изменить операцию') : 'Новая операция'}
      onClose={onClose}
      footer={footer}
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex flex-col gap-4"
      >
        {!isReadOnly && (
          <SegmentedControl
            label="Тип операции"
            options={TYPE_OPTIONS}
            value={values.type}
            onChange={changeType}
            isAccent
          />
        )}
        <AmountInput
          ref={amountRef}
          id={`${formId}-amount`}
          value={values.amount}
          onChange={(v) => setField('amount', v)}
          onBlur={() => touch('amount')}
          error={visibleErrors.amount}
          isReadOnly={isReadOnly}
        />
        <section aria-labelledby={`${formId}-cat-label`} className="flex flex-col gap-2">
          <h3 id={`${formId}-cat-label`} className="text-[13px] font-medium text-muted-foreground">
            Категория <span className="text-destructive">*</span>
          </h3>
          <CategoryPicker
            categories={visibleCategories}
            value={categoryId}
            onChange={changeCategory}
            isDisabled={isReadOnly}
          />
        </section>
        {categoryId && (
          <section aria-labelledby={`${formId}-sub-label`} className="flex flex-col gap-2">
            <h3
              id={`${formId}-sub-label`}
              className="text-[13px] font-medium text-muted-foreground"
            >
              Подкатегория <span className="text-destructive">*</span>
            </h3>
            <SubcategoryPicker
              id={`${formId}-subcategoryId`}
              subcategories={visibleSubcategories}
              value={values.subcategoryId}
              onChange={(v) => setField('subcategoryId', v)}
              error={visibleErrors.subcategoryId}
              isDisabled={isReadOnly}
            />
          </section>
        )}
        {!categoryId && visibleErrors.subcategoryId && (
          <p
            id={`${formId}-subcategoryId`}
            tabIndex={-1}
            role="alert"
            className="text-[13px] text-destructive outline-none"
          >
            Выберите категорию и подкатегорию
          </p>
        )}
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-muted-foreground">Детали</h3>
          <TagsInput
            id={`${formId}-tags`}
            value={values.tags}
            allTags={tags}
            onChange={(v) => setField('tags', v)}
            onBlur={() => touch('tags')}
            error={visibleErrors.tags}
            isDisabled={isReadOnly}
          />
          <DateCommentFields
            idPrefix={formId}
            date={values.date}
            comment={values.comment}
            today={today}
            dateError={visibleErrors.date}
            commentError={visibleErrors.comment}
            isReadOnly={isReadOnly}
            onDate={(v) => setField('date', v)}
            onComment={(v) => setField('comment', v)}
            onBlur={touch}
          />
        </section>
        {isEdit && transaction && (
          <p className="text-xs text-muted-foreground">
            Автор: {authorName(lookups, transaction.authorId)}
          </p>
        )}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
