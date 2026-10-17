import { useId, useState } from 'react';

import { todayIso } from '@/shared/lib/dates';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { TextInput } from '@/shared/ui/TextInput';
import type { Period } from '@/shared/types/domain';

import { validateRange } from '../model/period';

export interface RangeDialogProps {
  initial: Period;
  onApply: (period: Period) => void;
  onClose: () => void;
}

/** Выбор произвольного диапазона дат (FR-5.4): «Применить» неактивна, пока диапазон некорректен. */
export function RangeDialog({ initial, onApply, onClose }: RangeDialogProps) {
  const id = useId();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const error = from && to ? validateRange(from, to) : 'Укажите обе даты';
  const max = todayIso();

  return (
    <Modal
      title="Свой диапазон"
      onClose={onClose}
      footer={
        <Button
          isBlock
          size="lg"
          disabled={error !== null}
          onClick={() => onApply({ mode: 'range', from, to })}
        >
          Применить
        </Button>
      }
    >
      <div className="grid gap-4 pt-1 sm:grid-cols-2">
        <Field id={`${id}-from`} label="С">
          <TextInput
            id={`${id}-from`}
            type="date"
            value={from}
            max={max}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field id={`${id}-to`} label="По">
          <TextInput
            id={`${id}-to`}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            hasError={error !== null && Boolean(from && to)}
          />
        </Field>
      </div>
      {error && from && to && (
        <p className="mt-3 text-[13px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
