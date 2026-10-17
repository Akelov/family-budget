import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { periodContaining } from '@/features/period/model/period';
import { cn } from '@/shared/lib/cn';
import { todayIso } from '@/shared/lib/dates';
import { IconButton } from '@/shared/ui/IconButton';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import type { PeriodMode } from '@/shared/types/domain';

import type { UsePeriodResult } from '../hooks/usePeriod';
import { formatPeriodLabel } from '../model/period';
import { RangeDialog } from './RangeDialog';

export interface PeriodSwitcherProps {
  state: UsePeriodResult;
  /** Показывать переключатель режима (на «Плане» режим всегда семейный). */
  hasModeSwitch?: boolean;
  className?: string;
}

const MODE_OPTIONS = [
  { value: 'month', label: 'Месяц' },
  { value: 'cycle', label: 'Свой цикл' },
  { value: 'range', label: 'Диапазон' },
] as const satisfies ReadonlyArray<{ value: PeriodMode; label: string }>;

/** Стрелки ‹ › с подписью периода, режим и «К текущему периоду» (FR-5.6). */
export function PeriodSwitcher({ state, hasModeSwitch = true, className }: PeriodSwitcherProps) {
  const { period, startDay, isCurrent, shift, setPeriod, resetToCurrent } = state;
  const [isRangeOpen, setIsRangeOpen] = useState(false);

  function changeMode(mode: PeriodMode) {
    if (mode === 'range') {
      setIsRangeOpen(true);
      return;
    }
    setPeriod(periodContaining(todayIso(), mode, startDay));
  }

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex items-center justify-between gap-1 rounded-full bg-card px-1 py-1 shadow-card">
        <IconButton label="Предыдущий период" onClick={() => shift(-1)}>
          <ChevronLeft />
        </IconButton>
        <p
          className="min-w-0 truncate text-center text-sm font-semibold min-[400px]:text-[15px]"
          aria-live="polite"
        >
          {formatPeriodLabel(period)}
        </p>
        <IconButton label="Следующий период" onClick={() => shift(1)}>
          <ChevronRight />
        </IconButton>
      </div>
      {hasModeSwitch && (
        <SegmentedControl
          label="Режим периода"
          options={MODE_OPTIONS}
          value={period.mode}
          onChange={changeMode}
        />
      )}
      {!isCurrent && (
        <button
          type="button"
          onClick={resetToCurrent}
          className="self-center rounded-full px-3 py-1 text-[13px] font-medium text-primary hover:bg-accent"
        >
          К текущему периоду
        </button>
      )}
      {isRangeOpen && (
        <RangeDialog
          initial={period}
          onClose={() => setIsRangeOpen(false)}
          onApply={(next) => {
            setPeriod(next);
            setIsRangeOpen(false);
          }}
        />
      )}
    </div>
  );
}
