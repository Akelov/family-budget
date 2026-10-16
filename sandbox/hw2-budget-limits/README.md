# hw2-budget-limits — модуль месячных лимитов (ДЗ2, Chain-of-Thought)

Бизнес-логика фичи «Бюджеты», написанная агентом Claude Code по цепочке из 4 промптов
(см. [docs/hw2/prompt_methodology.md](../../docs/hw2/prompt_methodology.md)).

## Запуск

```bash
npm install
npm test            # 59 тестов (node:test + tsx)
npm run typecheck   # tsc --noEmit
```

## Публичный API (`src/features/budgets/model/index.ts`)

- `buildBudgetOverview(budgets, transactions, month, today)` — сводка по всем лимитам месяца:
  потрачено, остаток, процент, «почти у лимита» (≥ 80%), превышение, прогноз до конца месяца.
- `normalizeCategory(name)`, `NEAR_LIMIT_THRESHOLD_PERCENT`, типы `Budget`, `BudgetStatus`.

Тесты здесь на `node:test`, потому что в среде агента не было доступа к npm.
В ДЗ4 модуль переносится в основной проект и тесты переводятся на Vitest.
