// Единицы измерения: на входе и выходе модуля суммы — в рублях (как в БД numeric(12,2)
// и как ожидает formatMoney), а все промежуточные расчёты ведутся в копейках.

/** Месячный лимит расходов по категории */
export interface Budget {
  /**
   * Название категории. Сопоставляется с `Transaction.category`
   * после `trim()` без учёта регистра.
   */
  category: string;
  /** Месяц в формате `YYYY-MM` */
  month: string;
  /** Лимит в рублях: неотрицательный, не более 2 знаков после запятой; 0 допустим */
  limit: number;
}

/** Состояние лимита по категории за месяц — результат расчёта для отображения */
export interface BudgetStatus {
  /** Название категории в исходном написании из `Budget` (для показа в UI) */
  category: string;
  /** Месяц в формате `YYYY-MM` */
  month: string;
  /** Лимит, ₽ */
  limit: number;
  /** Потрачено за месяц, ₽ */
  spent: number;
  /** Остаток до лимита, ₽: `max(0, limit − spent)`, никогда не отрицательный */
  remaining: number;
  /** Сумма превышения, ₽: `max(0, spent − limit)` */
  overspent: number;
  /**
   * Процент использования лимита — целое, округлено вниз, может быть больше 100.
   * `null`, если лимит равен 0 (процент от нуля не определён).
   */
  percentUsed: number | null;
  /** Лимит превышен: строго `spent > limit`; ровно 100% — ещё не превышение */
  isExceeded: boolean;
  /**
   * Почти у лимита: `percentUsed >= NEAR_LIMIT_THRESHOLD_PERCENT` и лимит не превышен.
   * Взаимоисключающий с `isExceeded`; при `percentUsed === null` — `false`.
   */
  isNearLimit: boolean;
  /**
   * Прогноз расходов на весь месяц при текущем темпе, ₽.
   * Для прошедшего месяца равен `spent`; `null` для месяца, который ещё не начался.
   */
  forecast: number | null;
  /** Прогноз превышает лимит; `false`, если прогноза нет */
  isForecastExceeded: boolean;
}
