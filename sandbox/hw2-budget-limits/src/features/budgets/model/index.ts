// Публичный API модели бюджетов. UI и хуки импортируют только отсюда,
// внутренние шаги расчёта (суммы в копейках, прогноз) остаются деталями реализации.
export { buildBudgetOverview } from './budgetOverview';
export { normalizeCategory } from './category';
export { NEAR_LIMIT_THRESHOLD_PERCENT } from './constants';
export type { Budget, BudgetStatus } from './types';
