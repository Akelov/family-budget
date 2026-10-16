# Тестирование системы правил (Шаг 5)

## Как проводился эксперимент

Одна и та же задача была отдана агенту **Claude Code** дважды, одним и тем же
промптом и с одними и теми же разрешениями (чтение и запись файлов, без запуска команд):

| | Запуск ДО правил | Запуск ПОСЛЕ правил |
|---|---|---|
| Папка | пустая | пустая + `CLAUDE.md` с правилами ([rules.md](rules.md)) |
| Команда | `claude -p "<промпт>"` | `claude -p "<промпт>"` |
| Модель, настройки | одинаковые | одинаковые |

Каждый запуск — отдельная чистая сессия агента: он не видел ни нашего проекта,
ни результатов второго запуска. Единственное различие — файл `CLAUDE.md`.

**Промпт** (намеренно короткий, «как обычно пишут» — без RTCF, чтобы проверить именно правила):

```text
Напиши на TypeScript функцию calculateMonthSummary для приложения семейного бюджета. По списку операций (доходы и расходы) за указанный месяц она считает: сумму доходов, сумму расходов, баланс и расходы по категориям. Сохрани код и тесты в файлы.
```

Сырые файлы обоих запусков лежат в папке [`ab/`](ab/): [`ab/without/`](ab/without/) и [`ab/with/`](ab/with/).

---

## ДО применения правил

### Сырой ответ агента

Я написал функцию и тесты, но запустить тесты не получилось: команда запуска требует разрешения, а его не дали. Так что они пока **не проверены**.

**Файлы:**
- `monthSummary.ts` — типы `Transaction`, `MonthSummary` и сама функция `calculateMonthSummary(transactions, month)`
- `monthSummary.test.ts` — 9 тестов на встроенном раннере Node (`node:test`), без внешних зависимостей

**Как устроено:**
- **Суммы хранятся в копейках, целыми числами.** Если считать в рублях дробными числами, накапливаются ошибки округления: 0.1 + 0.2 даёт 0.30000000000000004.
- **Дата задаётся строкой `YYYY-MM-DD`, месяц — строкой `YYYY-MM`.** Принадлежность операции к месяцу проверяется сравнением строк, без `Date`. Так операции 1-го и последнего числа не уезжают в соседний месяц из-за часового пояса.
- **Результат:** `{ month, totalIncome, totalExpenses, balance, expensesByCategory }`. Баланс может быть отрицательным. Доходы в разбивку по категориям не входят.
- **Расходы без категории** (пустая строка или одни пробелы) собираются в «Без категории».
- **Некорректные данные вызывают ошибку с id операции:** неверный формат месяца или даты, сумма ≤ 0 или дробная, неизвестный тип операции. Операции за другие месяцы просто пропускаются, но их тоже проверяют на корректность.

**Тесты покрывают:** обычный подсчёт, граничные даты (30.09, 01.10, 31.10, 01.11 и тот же месяц другого года), пустой список, отрицательный баланс, пустые категории, точность в копейках и проверку входных данных.

**Как запустить** (нужен Node 22.6 или новее, у вас 22.22):
```
node --experimental-strip-types --test monthSummary.test.ts
```
Если разрешите эту команду, я запущу её сам и исправлю, если что-то упадёт.

### Сырой код: `monthSummary.ts`

```ts
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Сумма в копейках (целое положительное число), чтобы избежать ошибок округления float. */
  amount: number;
  /** Дата операции в формате YYYY-MM-DD. */
  date: string;
  category: string;
}

export interface MonthSummary {
  /** Месяц в формате YYYY-MM. */
  month: string;
  totalIncome: number;
  totalExpenses: number;
  /** Доходы минус расходы; может быть отрицательным. */
  balance: number;
  /** Расходы по категориям, в копейках. */
  expensesByCategory: Record<string, number>;
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^(\d{4}-(0[1-9]|1[0-2]))-(0[1-9]|[12]\d|3[01])$/;

/**
 * Считает итоги за месяц по списку операций.
 * Операции других месяцев игнорируются. Все суммы — в копейках.
 *
 * @param transactions список операций
 * @param month месяц в формате YYYY-MM, например '2026-10'
 */
export function calculateMonthSummary(
  transactions: readonly Transaction[],
  month: string,
): MonthSummary {
  if (!MONTH_RE.test(month)) {
    throw new Error(`Некорректный месяц "${month}", ожидается формат YYYY-MM`);
  }

  let totalIncome = 0;
  let totalExpenses = 0;
  const expensesByCategory: Record<string, number> = {};

  for (const t of transactions) {
    // Дату сравниваем как строку, а не через Date, чтобы часовой пояс
    // не переносил операции 1-го/последнего числа в соседний месяц.
    const match = DATE_RE.exec(t.date);
    if (!match) {
      throw new Error(`Операция ${t.id}: некорректная дата "${t.date}", ожидается YYYY-MM-DD`);
    }
    if (!Number.isSafeInteger(t.amount) || t.amount <= 0) {
      throw new Error(`Операция ${t.id}: сумма должна быть целым положительным числом копеек`);
    }
    if (match[1] !== month) continue;

    if (t.type === 'income') {
      totalIncome += t.amount;
    } else if (t.type === 'expense') {
      totalExpenses += t.amount;
      const category = t.category.trim() || 'Без категории';
      expensesByCategory[category] = (expensesByCategory[category] ?? 0) + t.amount;
    } else {
      throw new Error(`Операция ${t.id}: неизвестный тип "${String(t.type)}"`);
    }
  }

  return {
    month,
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    expensesByCategory,
  };
}
```

<details>
<summary>Сырой код тестов: <code>monthSummary.test.ts</code> (9 тестов, node:test)</summary>

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMonthSummary } from './monthSummary.ts';
import type { Transaction } from './monthSummary.ts';

const tx = (
  id: string,
  type: Transaction['type'],
  amount: number,
  date: string,
  category = 'Прочее',
): Transaction => ({ id, type, amount, date, category });

test('считает доходы, расходы, баланс и категории за месяц', () => {
  const transactions = [
    tx('1', 'income', 15_000_000, '2026-10-05', 'Зарплата'),
    tx('2', 'income', 2_000_000, '2026-10-20', 'Подработка'),
    tx('3', 'expense', 450_050, '2026-10-01', 'Продукты'),
    tx('4', 'expense', 120_000, '2026-10-15', 'Продукты'),
    tx('5', 'expense', 3_000_000, '2026-10-31', 'Аренда'),
  ];

  assert.deepEqual(calculateMonthSummary(transactions, '2026-10'), {
    month: '2026-10',
    totalIncome: 17_000_000,
    totalExpenses: 3_570_050,
    balance: 13_429_950,
    expensesByCategory: { Продукты: 570_050, Аренда: 3_000_000 },
  });
});

test('игнорирует операции других месяцев, включая граничные даты', () => {
  const transactions = [
    tx('1', 'expense', 100, '2026-09-30'),
    tx('2', 'expense', 200, '2026-10-01'),
    tx('3', 'expense', 300, '2026-10-31'),
    tx('4', 'expense', 400, '2026-11-01'),
    tx('5', 'income', 500, '2025-10-15'), // тот же месяц, другой год
  ];

  const summary = calculateMonthSummary(transactions, '2026-10');
  assert.equal(summary.totalExpenses, 500);
  assert.equal(summary.totalIncome, 0);
});

test('пустой список и месяц без операций дают нули', () => {
  const expected = {
    month: '2026-10',
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    expensesByCategory: {},
  };
  assert.deepEqual(calculateMonthSummary([], '2026-10'), expected);
  assert.deepEqual(
    calculateMonthSummary([tx('1', 'income', 100, '2026-01-01')], '2026-10'),
    expected,
  );
});

test('баланс может быть отрицательным', () => {
  const summary = calculateMonthSummary(
    [tx('1', 'income', 1000, '2026-10-01'), tx('2', 'expense', 2500, '2026-10-02')],
    '2026-10',
  );
  assert.equal(summary.balance, -1500);
});

test('доходы не попадают в расходы по категориям', () => {
  const summary = calculateMonthSummary(
    [tx('1', 'income', 1000, '2026-10-01', 'Зарплата')],
    '2026-10',
  );
  assert.deepEqual(summary.expensesByCategory, {});
});

test('пустая категория расхода сводится к "Без категории"', () => {
  const summary = calculateMonthSummary(
    [tx('1', 'expense', 100, '2026-10-01', ''), tx('2', 'expense', 50, '2026-10-02', '  ')],
    '2026-10',
  );
  assert.deepEqual(summary.expensesByCategory, { 'Без категории': 150 });
});

test('суммы в копейках складываются без ошибок округления', () => {
  // 0.1 + 0.2 руб. во float дало бы 0.30000000000000004
  const summary = calculateMonthSummary(
    [tx('1', 'expense', 10, '2026-10-01'), tx('2', 'expense', 20, '2026-10-02')],
    '2026-10',
  );
  assert.equal(summary.totalExpenses, 30);
});

test('отклоняет некорректный месяц', () => {
  for (const month of ['2026-13', '2026-1', '10-2026', '', '2026-00']) {
    assert.throws(() => calculateMonthSummary([], month), /Некорректный месяц/);
  }
});

test('отклоняет некорректные операции', () => {
  const bad: Transaction[] = [
    tx('1', 'expense', -100, '2026-10-01'),
    tx('2', 'expense', 0, '2026-10-01'),
    tx('3', 'expense', 10.5, '2026-10-01'),
    tx('4', 'expense', 100, '2026-10-1'),
    tx('5', 'expense', 100, 'не дата'),
    { ...tx('6', 'expense', 100, '2026-10-01'), type: 'refund' as Transaction['type'] },
  ];
  for (const t of bad) {
    assert.throws(() => calculateMonthSummary([t], '2026-10'), new RegExp(`Операция ${t.id}`));
  }
});
```

</details>

---

## ПОСЛЕ применения правил

### Сырой ответ агента

Я написал `calculateMonthSummary` и тесты к ней и сохранил в файлы, но **тесты ещё не запускались**. Проект был пустым, а установку зависимостей (`npm install`) и даже проверочный запуск `node` нужно подтвердить. Поэтому по правилу 26 задачу пока нельзя считать закрытой.

## 1. Что создано
| Файл | Зачем |
|---|---|
| `src/features/transactions/model/types.ts` | Типы операции (`Transaction`) и итогов месяца (`MonthSummary`, `CategoryExpense`) |
| `src/features/transactions/model/calculateMonthSummary.ts` | Сама функция |
| `src/features/transactions/model/calculateMonthSummary.test.ts` | 21 тест: основной расчёт, граница месяца, `0.1 + 0.2`, пустой месяц, отрицательный баланс, порядок категорий, неизменность входных данных, ошибки |
| `src/shared/lib/money.ts` + `money.test.ts` | Перевод рублей в копейки и обратно с проверкой входа (правила 7 и 18) |
| `package.json`, `tsconfig.json`, `vitest.config.ts` | Минимальная настройка: Vitest, strict TS, алиас `@/` |

## 2. Как работает функция
`calculateMonthSummary(transactions, 'YYYY-MM')` берёт операции только за указанный месяц и возвращает `{ month, totalIncome, totalExpense, balance, expensesByCategory }`.
- Все суммы считаются в целых копейках, в рубли результат переводится только в конце.
- Расходы по категориям отсортированы по убыванию суммы, при равных суммах — по `categoryId`.
- Если месяц указан не в формате `YYYY-MM`, функция выдаёт ошибку `RangeError`.
- Ту же ошибку она выдаёт, если у операции этого месяца сумма ≤ 0, `NaN` или в ней больше 2 знаков после запятой. Знак задаётся типом операции, поэтому такие суммы — это битые данные, и молча складывать их нельзя.

Пока ждал подтверждения, я нашёл и исправил ошибку в `toKopecks`. Фиксированный допуск на погрешность float отклонял бы крупные корректные суммы вроде максимальной для `numeric(12,2)` (9 999 999 999,99). Теперь допуск зависит от величины суммы.

## 3. Команды для проверки
```bash
npm install
npm test            # vitest run
npm run typecheck   # tsc --noEmit
```

## 4. Допущения и что осталось
- **Возвращаю рубли, а не копейки.** Так результат в тех же единицах, что и входные данные и база. Если `formatMoney` будет принимать копейки, поменять это просто.
- **Новые зависимости:** добавил только `vitest` и `typescript`, оба уже есть в стеке из CLAUDE.md.
- **Осталось:** запустить тесты и `tsc`. Подтвердите `npm install`, и я запущу проверки и покажу результат.

### Сырой код: `src/features/transactions/model/types.ts`

```ts
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Положительная сумма в рублях, до 2 знаков после запятой. Знак задаёт `type`. */
  amount: number;
  categoryId: string;
  /** Дата операции в формате `YYYY-MM-DD`. */
  date: string;
}

export interface CategoryExpense {
  categoryId: string;
  /** Сумма расходов по категории в рублях. */
  amount: number;
}

export interface MonthSummary {
  /** Месяц в формате `YYYY-MM`. */
  month: string;
  /** Сумма доходов в рублях. */
  totalIncome: number;
  /** Сумма расходов в рублях. */
  totalExpense: number;
  /** Доходы минус расходы, в рублях; может быть отрицательным. */
  balance: number;
  /** Расходы по категориям, по убыванию суммы. */
  expensesByCategory: CategoryExpense[];
}
```

### Сырой код: `src/shared/lib/money.ts`

```ts
// Допуск на погрешность float при умножении на 100 (например, 1.15 * 100 = 114.99999999999999).
// Погрешность растёт с величиной числа, поэтому для больших сумм допуск относительный.
const MIN_KOPECKS_TOLERANCE = 1e-6;
const RELATIVE_TOLERANCE_FACTOR = 16;

function getKopecksTolerance(scaled: number): number {
  const relativeTolerance = Math.abs(scaled) * Number.EPSILON * RELATIVE_TOLERANCE_FACTOR;
  return Math.max(MIN_KOPECKS_TOLERANCE, relativeTolerance);
}

/**
 * Переводит сумму в рублях в целое число копеек.
 *
 * @param amount - сумма в рублях, не более 2 знаков после запятой (как `numeric(12,2)` в БД).
 * @returns целое число копеек.
 * @throws {RangeError} если сумма не конечное число (`NaN`, `Infinity`)
 *   или содержит больше 2 знаков после запятой.
 *
 * @example toKopecks(1.15) // 115
 */
export function toKopecks(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`Сумма должна быть конечным числом, получено: ${amount}`);
  }

  const scaled = amount * 100;
  const kopecks = Math.round(scaled);

  if (Math.abs(scaled - kopecks) > getKopecksTolerance(scaled)) {
    throw new RangeError(`Сумма не может содержать больше 2 знаков после запятой: ${amount}`);
  }

  // Math.round(-0.001) даёт -0 — нормализуем, чтобы не протекал отрицательный ноль.
  return kopecks === 0 ? 0 : kopecks;
}

/**
 * Переводит целое число копеек в рубли.
 *
 * @param kopecks - целое число копеек (может быть отрицательным, например для баланса).
 * @returns сумма в рублях.
 * @throws {RangeError} если передано не целое число.
 *
 * @example fromKopecks(115) // 1.15
 */
export function fromKopecks(kopecks: number): number {
  if (!Number.isSafeInteger(kopecks)) {
    throw new RangeError(`Количество копеек должно быть целым числом, получено: ${kopecks}`);
  }

  return kopecks / 100;
}
```

### Сырой код: `src/features/transactions/model/calculateMonthSummary.ts`

```ts
import { fromKopecks, toKopecks } from '@/shared/lib/money';

import type { CategoryExpense, MonthSummary, Transaction } from './types';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

interface KopecksTotals {
  income: number;
  expense: number;
  byCategory: ReadonlyMap<string, number>;
}

const EMPTY_TOTALS: KopecksTotals = { income: 0, expense: 0, byCategory: new Map() };

function assertValidMonth(month: string): void {
  if (!MONTH_PATTERN.test(month)) {
    throw new RangeError(`Месяц должен быть в формате YYYY-MM, получено: "${month}"`);
  }
}

// Отрицательная или нулевая сумма означает битые данные: знак задаёт тип операции,
// а не сама сумма, поэтому молча складывать такие значения нельзя.
function toPositiveKopecks(transaction: Transaction): number {
  const kopecks = toKopecks(transaction.amount);
  if (kopecks <= 0) {
    throw new RangeError(
      `Сумма операции ${transaction.id} должна быть положительной, получено: ${transaction.amount}`,
    );
  }
  return kopecks;
}

function addTransaction(totals: KopecksTotals, transaction: Transaction): KopecksTotals {
  const kopecks = toPositiveKopecks(transaction);

  if (transaction.type === 'income') {
    return { ...totals, income: totals.income + kopecks };
  }

  const byCategory = new Map(totals.byCategory);
  byCategory.set(transaction.categoryId, (byCategory.get(transaction.categoryId) ?? 0) + kopecks);
  return { ...totals, expense: totals.expense + kopecks, byCategory };
}

function toSortedCategoryExpenses(byCategory: ReadonlyMap<string, number>): CategoryExpense[] {
  return [...byCategory.entries()]
    .sort(([idA, a], [idB, b]) => b - a || idA.localeCompare(idB))
    .map(([categoryId, kopecks]) => ({ categoryId, amount: fromKopecks(kopecks) }));
}

/**
 * Считает сводку по операциям семьи за месяц: доходы, расходы, баланс и расходы по категориям.
 * Вся арифметика ведётся в копейках, в рубли результат переводится только в конце.
 *
 * @param transactions - список операций (может содержать операции других месяцев — они игнорируются).
 * @param month - месяц в формате `YYYY-MM`.
 * @returns сводка за месяц; суммы в рублях. Если операций за месяц нет — все суммы равны 0,
 *   а `expensesByCategory` пуст. Баланс может быть отрицательным. Категории отсортированы
 *   по убыванию суммы, при равенстве — по `categoryId`.
 * @throws {RangeError} если `month` не в формате `YYYY-MM`, либо у операции выбранного месяца
 *   сумма не положительная или содержит больше 2 знаков после запятой.
 */
export function calculateMonthSummary(
  transactions: readonly Transaction[],
  month: string,
): MonthSummary {
  assertValidMonth(month);

  const totals = transactions
    .filter((transaction) => transaction.date.slice(0, 7) === month)
    .reduce(addTransaction, EMPTY_TOTALS);

  return {
    month,
    totalIncome: fromKopecks(totals.income),
    totalExpense: fromKopecks(totals.expense),
    balance: fromKopecks(totals.income - totals.expense),
    expensesByCategory: toSortedCategoryExpenses(totals.byCategory),
  };
}
```

<details>
<summary>Сырой код тестов: <code>calculateMonthSummary.test.ts</code> (19 тестов, Vitest)</summary>

```ts
import { describe, expect, it } from 'vitest';

import { calculateMonthSummary } from './calculateMonthSummary';
import type { Transaction } from './types';

// Мок-данные: id и категории условные, суммы вымышленные.
function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    type: 'expense',
    amount: 100,
    categoryId: 'cat-food',
    date: '2026-03-15',
    ...overrides,
  };
}

const MARCH_TRANSACTIONS: Transaction[] = [
  makeTransaction({ id: 'tx-1', type: 'income', amount: 50000, categoryId: 'cat-salary' }),
  makeTransaction({ id: 'tx-2', type: 'income', amount: 1500.5, categoryId: 'cat-other' }),
  makeTransaction({ id: 'tx-3', amount: 1200.3, categoryId: 'cat-food', date: '2026-03-01' }),
  makeTransaction({ id: 'tx-4', amount: 800.2, categoryId: 'cat-food', date: '2026-03-31' }),
  makeTransaction({ id: 'tx-5', amount: 15000, categoryId: 'cat-rent' }),
  makeTransaction({ id: 'tx-6', amount: 450, categoryId: 'cat-transport' }),
];

describe('calculateMonthSummary', () => {
  it('считает доходы, расходы, баланс и расходы по категориям', () => {
    const summary = calculateMonthSummary(MARCH_TRANSACTIONS, '2026-03');

    expect(summary).toEqual({
      month: '2026-03',
      totalIncome: 51500.5,
      totalExpense: 17450.5,
      balance: 34050,
      expensesByCategory: [
        { categoryId: 'cat-rent', amount: 15000 },
        { categoryId: 'cat-food', amount: 2000.5 },
        { categoryId: 'cat-transport', amount: 450 },
      ],
    });
  });

  it('игнорирует операции других месяцев, включая соседние даты', () => {
    const transactions = [
      ...MARCH_TRANSACTIONS,
      makeTransaction({ id: 'tx-feb', amount: 999, date: '2026-02-28' }),
      makeTransaction({ id: 'tx-apr', type: 'income', amount: 999, date: '2026-04-01' }),
      makeTransaction({ id: 'tx-prev-year', amount: 999, date: '2025-03-15' }),
    ];

    const summary = calculateMonthSummary(transactions, '2026-03');

    expect(summary.totalIncome).toBe(51500.5);
    expect(summary.totalExpense).toBe(17450.5);
  });

  it('не накапливает ошибку float при сложении копеек', () => {
    const transactions = [
      makeTransaction({ id: 'tx-1', amount: 0.1 }),
      makeTransaction({ id: 'tx-2', amount: 0.2 }),
    ];

    const summary = calculateMonthSummary(transactions, '2026-03');

    expect(summary.totalExpense).toBe(0.3);
    expect(summary.balance).toBe(-0.3);
    expect(summary.expensesByCategory).toEqual([{ categoryId: 'cat-food', amount: 0.3 }]);
  });

  it('возвращает нули и пустой список, если операций за месяц нет', () => {
    expect(calculateMonthSummary([], '2026-03')).toEqual({
      month: '2026-03',
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      expensesByCategory: [],
    });
  });

  it('возвращает отрицательный баланс, если расходы больше доходов', () => {
    const transactions = [
      makeTransaction({ id: 'tx-1', type: 'income', amount: 1000, categoryId: 'cat-salary' }),
      makeTransaction({ id: 'tx-2', amount: 1500.75 }),
    ];

    expect(calculateMonthSummary(transactions, '2026-03').balance).toBe(-500.75);
  });

  it('не включает доходы в расходы по категориям', () => {
    const transactions = [makeTransaction({ type: 'income', amount: 1000, categoryId: 'cat-salary' })];

    expect(calculateMonthSummary(transactions, '2026-03').expensesByCategory).toEqual([]);
  });

  it('при равных суммах сортирует категории по categoryId', () => {
    const transactions = [
      makeTransaction({ id: 'tx-1', amount: 300, categoryId: 'cat-b' }),
      makeTransaction({ id: 'tx-2', amount: 300, categoryId: 'cat-a' }),
    ];

    const categoryIds = calculateMonthSummary(transactions, '2026-03').expensesByCategory.map(
      (expense) => expense.categoryId,
    );

    expect(categoryIds).toEqual(['cat-a', 'cat-b']);
  });

  it('не мутирует входной массив', () => {
    const transactions = Object.freeze([...MARCH_TRANSACTIONS]);

    expect(() => calculateMonthSummary(transactions, '2026-03')).not.toThrow();
    expect(transactions).toEqual(MARCH_TRANSACTIONS);
  });

  it.each(['2026-3', '2026-13', '2026-00', '03-2026', '2026-03-01', ''])(
    'бросает ошибку для некорректного месяца "%s"',
    (month) => {
      expect(() => calculateMonthSummary(MARCH_TRANSACTIONS, month)).toThrow(RangeError);
    },
  );

  it.each([0, -100, 10.555, Number.NaN])(
    'бросает ошибку для некорректной суммы операции %s',
    (amount) => {
      const transactions = [makeTransaction({ amount })];

      expect(() => calculateMonthSummary(transactions, '2026-03')).toThrow(RangeError);
    },
  );

  it('не проверяет суммы операций других месяцев', () => {
    const transactions = [makeTransaction({ amount: -1, date: '2026-02-10' })];

    expect(calculateMonthSummary(transactions, '2026-03').totalExpense).toBe(0);
  });
});
```

</details>

<details>
<summary>Сырой код тестов: <code>money.test.ts</code> (7 тестов, Vitest)</summary>

```ts
import { describe, expect, it } from 'vitest';

import { fromKopecks, toKopecks } from './money';

describe('toKopecks', () => {
  it('переводит рубли в копейки', () => {
    expect(toKopecks(150)).toBe(15000);
    expect(toKopecks(99.99)).toBe(9999);
  });

  it('корректно обрабатывает значения с погрешностью float', () => {
    expect(toKopecks(1.15)).toBe(115);
    expect(toKopecks(0.1 + 0.2)).toBe(30);
  });

  it('обрабатывает ноль, отрицательные и максимальные для numeric(12,2) значения', () => {
    expect(toKopecks(0)).toBe(0);
    expect(Object.is(toKopecks(-0), 0)).toBe(true);
    expect(toKopecks(-12.5)).toBe(-1250);
    expect(toKopecks(9_999_999_999.99)).toBe(999_999_999_999);
  });

  it('бросает ошибку для больше чем 2 знаков после запятой', () => {
    expect(() => toKopecks(1.005)).toThrow(RangeError);
  });

  it('бросает ошибку для NaN и Infinity', () => {
    expect(() => toKopecks(Number.NaN)).toThrow(RangeError);
    expect(() => toKopecks(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('fromKopecks', () => {
  it('переводит копейки в рубли', () => {
    expect(fromKopecks(115)).toBe(1.15);
    expect(fromKopecks(-1250)).toBe(-12.5);
    expect(fromKopecks(0)).toBe(0);
  });

  it('бросает ошибку для дробного количества копеек', () => {
    expect(() => fromKopecks(1.5)).toThrow(RangeError);
    expect(() => fromKopecks(Number.NaN)).toThrow(RangeError);
  });
});
```

</details>

---

## Проверка: прогон тестов

Агенту в обоих запусках не дали запускать команды, поэтому тесты прогнал я отдельно:

| | ДО правил | ПОСЛЕ правил |
|---|---|---|
| Тестов | 9 | 26 (19 + 7) |
| Результат | 9 / 9 пройдено | 26 / 26 пройдено |
| Чем запускалось | `node --import tsx --test` | Vitest недоступен без npm-реестра, поэтому через переходник API Vitest на `node:test` |

В ответе агента «ПОСЛЕ» написано «21 тест», а при прогоне их 19. Агент ошибся
в подсчёте в своём отчёте. Это ещё один довод перепроверять итоговые цифры агента.

## Сравнение по правилам проекта

| Критерий (номер правила) | ДО правил | ПОСЛЕ правил |
|---|---|---|
| Структура по фичам (6) | ❌ один файл в корне, типы внутри | ✅ `features/transactions/model/`, `shared/lib/money.ts`, отдельный `types.ts` |
| Контракт данных о деньгах (7) | ⚠️ считает в копейках, но **поменял входной формат**: `amount` в копейках. Это не совпадает с БД (`numeric(12,2)`, рубли) и `formatMoney` | ✅ на входе рубли, как в БД, внутри копейки, на выходе снова рубли. Перевод в одной функции `toKopecks` |
| Неизменяемость, короткие функции (11) | ⚠️ цикл `for` с мутацией `let`, одна функция на 40 строк | ✅ `filter` + `reduce` без мутаций, 5 маленьких функций, отдельный тест на неизменность входа |
| JSDoc (12) | ✅ есть | ✅ есть, плюс `@throws` и `@example` |
| Тип ошибок | `Error` | `RangeError`, единообразно с остальным проектом |
| Импорты, алиас `@/` (13) | — | ✅ |
| Категории (4) | по названию, с `trim` и «Без категории» | по `categoryId`: категория — отдельная сущность |
| Мок-данные (21) | ✅ вымышленные | ✅ вымышленные + явный комментарий |
| Тесты: стек и полнота (24) | ⚠️ `node:test`, а не Vitest из стека; 9 тестов | ✅ Vitest; 26 тестов: позитив, края, `it.each` по ошибкам |
| Честность про проверку (26) | ✅ сказал, что тесты не запускались | ✅ сказал, что задача не закрыта, пока тесты не прошли (сослался на правило 26) |
| **Проверка формата даты** | ✅ **проверяет** `YYYY-MM-DD`, на мусор бросает ошибку | ❌ **не проверяет**: `date.slice(0, 7)`, кривая дата молча отбрасывается |
| Время и шаги агента | 41 с, 7 шагов | 103 с, 19 шагов |
| Лишнее | — | создал `package.json`, `tsconfig`, `vitest.config` (для пустой папки уместно, для маленькой задачи — объём) |

## Вывод

**Что конкретно улучшилось.** С правилами агент написал код, который можно сразу
перенести в проект. Файлы лежат по нашей архитектуре (`features/.../model`,
`shared/lib`), тесты написаны на Vitest из стека, импорты идут через `@/`. Главное —
агент сохранил **правильный контракт денежных данных**: принимает рубли, как они
хранятся в БД, считает внутри в копейках и отдаёт рубли для `formatMoney`. Без правил
агент тоже ушёл от float, но сам придумал, что вход уже в копейках. Такой код в
проекте сломал бы стык с базой и форматированием. Кроме того, с правилами код
стал функциональным, без мутаций, ошибки типизированы `RangeError`, а тестов стало
почти втрое больше: 26 против 9, с систематическим перебором некорректных входов.

**Что не улучшилось и что поменяли.** Базовая модель и без правил пишет аккуратный
код: копейки, строковые даты без часовых поясов, JSDoc. Поэтому эффект правил —
не «из плохого в хорошее», а «из хорошего вообще в правильное для нашего проекта».
Нашлась и регрессия: без правил агент проверял формат даты, а с правилами перестал.
Правило 8 говорило только о формате хранения дат, но не требовало их проверять.
По итогам теста **правило 8 дополнено**: даты на входе функций `model/` проверяются,
некорректная дата — `RangeError`. Цена правил — в 2,5 раза больше времени и шагов,
для маленьких задач это заметно. Для проекта, который будет расти шесть этапов,
соответствие архитектуре этого стоит.
