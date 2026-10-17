import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { useReference } from '@/features/household/hooks/referenceContext';
import { todayIso } from '@/shared/lib/dates';
import type { FamilyPeriodMode, Period } from '@/shared/types/domain';

import { isSamePeriod, periodContaining, periodFromParams, shiftPeriod } from '../model/period';

export type PeriodScope = 'personal' | 'family';

export interface UsePeriodResult {
  period: Period;
  /** День начала цикла, по которому листаются периоды `cycle`. */
  startDay: number;
  /** Режим по умолчанию: личный вид участника или период семьи. */
  defaultMode: FamilyPeriodMode;
  isCurrent: boolean;
  setPeriod: (period: Period) => void;
  shift: (direction: -1 | 1) => void;
  resetToCurrent: () => void;
}

/**
 * Отчётный период экрана из параметров адреса (FR-3.14, FR-5.7).
 *
 * `personal` — «Операции» и «Отчёты»: по умолчанию личный вид участника или период семьи,
 * период из адреса важнее. `family` — «План»: всегда период семьи, личный вид и `range`
 * не действуют (FR-5.8).
 */
export function usePeriod(scope: PeriodScope): UsePeriodResult {
  const { household, member } = useReference();
  const [params, setParams] = useSearchParams();

  const usesPersonal = scope === 'personal' && member.personalPeriodMode !== null;
  const defaultMode: FamilyPeriodMode = usesPersonal
    ? (member.personalPeriodMode ?? 'month')
    : household.periodMode;
  // Для режима `month` день начала не важен; для `cycle` — личный день участника или день семьи.
  const startDay =
    (usesPersonal ? member.personalPeriodStartDay : null) ?? household.periodStartDay;
  const today = todayIso();
  const current = useMemo(
    () => periodContaining(today, defaultMode, startDay),
    [today, defaultMode, startDay],
  );

  const fromUrl = periodFromParams(params);
  const isAllowed =
    fromUrl !== null && (scope === 'personal' || fromUrl.mode === household.periodMode);
  const period = isAllowed && fromUrl ? fromUrl : current;

  const setPeriod = useCallback(
    (next: Period) => {
      setParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set('mode', next.mode);
        p.set('from', next.from);
        p.set('to', next.to);
        return p;
      });
    },
    [setParams],
  );

  const resetToCurrent = useCallback(() => {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      ['mode', 'from', 'to'].forEach((key) => p.delete(key));
      return p;
    });
  }, [setParams]);

  const shift = useCallback(
    (direction: -1 | 1) => setPeriod(shiftPeriod(period, direction, startDay)),
    [period, setPeriod, startDay],
  );

  return {
    period,
    startDay,
    defaultMode,
    isCurrent: isSamePeriod(period, current),
    setPeriod,
    shift,
    resetToCurrent,
  };
}
