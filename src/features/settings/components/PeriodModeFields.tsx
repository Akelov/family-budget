import { useId, useState } from 'react';

import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { TextInput } from '@/shared/ui/TextInput';
import type { FamilyPeriodMode } from '@/shared/types/domain';

export interface PeriodModeFieldsProps {
  mode: FamilyPeriodMode;
  startDay: number;
  onChange: (mode: FamilyPeriodMode, startDay: number) => void;
  isDisabled?: boolean;
}

const OPTIONS = [
  { value: 'month', label: 'Календарный месяц' },
  { value: 'cycle', label: 'Свой цикл' },
] as const;

/** Выбор режима периода: месяц или цикл с дня N (FR-5.1). */
export function PeriodModeFields({
  mode,
  startDay,
  onChange,
  isDisabled = false,
}: PeriodModeFieldsProps) {
  const id = useId();
  // День сохраняется при уходе с поля, а не на каждое нажатие: иначе ввод «29» сохранил бы сначала «2».
  const [dayText, setDayText] = useState(String(startDay));

  function commitDay() {
    const day = Number(dayText);
    if (Number.isInteger(day) && day >= 1 && day <= 31) {
      if (day !== startDay) onChange(mode, day);
    } else {
      setDayText(String(startDay));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {isDisabled ? (
        <p className="text-sm">
          {mode === 'month' ? 'Календарный месяц' : `Свой цикл с ${startDay}-го числа`}
        </p>
      ) : (
        <SegmentedControl
          label="Режим периода"
          options={OPTIONS}
          value={mode}
          onChange={(m) => onChange(m, startDay)}
        />
      )}
      {mode === 'cycle' && !isDisabled && (
        <div className="flex items-center gap-3">
          <label htmlFor={id} className="text-sm">
            Начало цикла — число месяца
          </label>
          <TextInput
            id={id}
            type="number"
            min={1}
            max={31}
            value={dayText}
            onChange={(e) => setDayText(e.target.value)}
            onBlur={commitDay}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitDay();
            }}
            className="num w-20 text-center"
          />
        </div>
      )}
      {mode === 'cycle' && !isDisabled && (
        <p className="text-xs text-muted-foreground">
          Например, 29 — период с 29-го по 28-е; в коротких месяцах начало сдвигается на последний
          день.
        </p>
      )}
    </div>
  );
}
