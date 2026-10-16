## Role
Ты — senior TypeScript-разработчик, продолжающий реализацию плана по правилам CLAUDE.md.

## Task
Выполни **волну 2** плана: П4 (`sumExpensesByCategory`), П5 (`calculateBudgetUsage`
вместе с `isNearLimit` по порогу из `constants.ts`), П6 (`forecastMonthSpending`).
Используй функции волны 1 (`toKopecks`, функции месяцев), не дублируй их.

## Context
- Готово в волне 1: `src/shared/lib/money.ts`, `src/shared/lib/month.ts`,
  `src/features/budgets/model/types.ts`, `constants.ts`.
- Таблица кейсов для П5 и критерии проверки П4/П6 — из твоего плана (шаг 1).
- Ограничение линейного прогноза (скачки в первые дни месяца) опиши в JSDoc.

## Format
1. Список созданных файлов.
2. JSDoc на русском, тесты: позитивный сценарий, краевой случай, ошибка — для каждой функции.
3. Запусти `npm test` и `npm run typecheck`, покажи итоговые строки вывода.
4. Короткий итог и что осталось на волну 3.
