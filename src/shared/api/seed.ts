import { addDays, parseIsoDate, todayIso } from '@/shared/lib/dates';
import type {
  Budget,
  Category,
  CategoryColor,
  Member,
  Subcategory,
  Tag,
  Transaction,
  TransactionType,
} from '@/shared/types/domain';

import type { DbState } from './mockDb';

/**
 * Демо-данные выдуманной семьи (правило 21: никаких реальных персональных данных).
 * Операции генерируются относительно сегодняшней даты на ~4 месяца назад детерминированным
 * генератором, чтобы при каждом сбросе картина была одинаковой и «свежей».
 */

interface CategorySeed {
  key: string;
  name: string;
  icon: string;
  color: CategoryColor;
  subs: string[];
}

const EXPENSE: CategorySeed[] = [
  {
    key: 'food',
    name: 'Продукты',
    icon: 'shopping-cart',
    color: 1,
    subs: ['Супермаркет', 'Рынок', 'Доставка'],
  },
  { key: 'cafe', name: 'Кафе', icon: 'coffee', color: 2, subs: ['Кофе', 'Обеды', 'Рестораны'] },
  {
    key: 'home',
    name: 'Дом',
    icon: 'house',
    color: 3,
    subs: ['Коммунальные услуги', 'Аренда', 'Ремонт', 'Товары для дома'],
  },
  {
    key: 'car',
    name: 'Автомобиль',
    icon: 'car',
    color: 4,
    subs: ['Топливо', 'Обслуживание', 'Запчасти', 'Штрафы', 'Платные дороги', 'Парковка'],
  },
  { key: 'transport', name: 'Транспорт', icon: 'bus', color: 5, subs: ['Общественный', 'Такси'] },
  { key: 'health', name: 'Здоровье', icon: 'heart-pulse', color: 6, subs: ['Аптека', 'Врачи'] },
  {
    key: 'kids',
    name: 'Дети',
    icon: 'baby',
    color: 7,
    subs: ['Кружки', 'Одежда', 'Игрушки', 'Карманные деньги'],
  },
  { key: 'clothes', name: 'Одежда', icon: 'shirt', color: 8, subs: ['Взрослая', 'Обувь'] },
  {
    key: 'phone',
    name: 'Связь',
    icon: 'smartphone',
    color: 9,
    subs: ['Мобильная связь', 'Интернет', 'Подписки'],
  },
  {
    key: 'fun',
    name: 'Развлечения',
    icon: 'ticket',
    color: 10,
    subs: ['Кино и события', 'Путешествия', 'Хобби'],
  },
  { key: 'gifts', name: 'Подарки', icon: 'gift', color: 11, subs: ['Подарки'] },
  { key: 'other', name: 'Прочее', icon: 'circle-ellipsis', color: 12, subs: ['Прочее'] },
];

const INCOME: CategorySeed[] = [
  {
    key: 'salary',
    name: 'Зарплата',
    icon: 'briefcase',
    color: 1,
    subs: ['Аванс', 'Основная выплата', 'Премия'],
  },
  { key: 'side', name: 'Подработка', icon: 'hammer', color: 2, subs: ['Подработка'] },
  {
    key: 'other-income',
    name: 'Прочие доходы',
    icon: 'wallet',
    color: 3,
    subs: ['Кэшбэк', 'Подарки', 'Возвраты', 'Прочее'],
  },
];

/** Готовый набор категорий (приложение A ТЗ) — используется и при создании семьи. */
export function defaultCategories(): { categories: Category[]; subcategories: Subcategory[] } {
  const build = (seeds: CategorySeed[], type: TransactionType) =>
    seeds.map((c) => ({
      category: {
        id: `cat-${c.key}`,
        type,
        name: c.name,
        color: c.color,
        icon: c.icon,
        archivedAt: null,
      },
      subs: c.subs.map((name, i) => ({
        id: `sub-${c.key}-${i + 1}`,
        categoryId: `cat-${c.key}`,
        name,
        archivedAt: null,
      })),
    }));
  const all = [...build(EXPENSE, 'expense'), ...build(INCOME, 'income')];
  return { categories: all.map((x) => x.category), subcategories: all.flatMap((x) => x.subs) };
}

/** Детерминированный генератор псевдослучайных чисел (mulberry32). */
function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MEMBERS: Member[] = [
  {
    id: 'm-alexey',
    householdId: 'h-demo',
    displayName: 'Алексей',
    role: 'owner',
    personalPeriodMode: null,
    personalPeriodStartDay: null,
    removedAt: null,
  },
  {
    id: 'm-maria',
    householdId: 'h-demo',
    displayName: 'Мария',
    role: 'admin',
    personalPeriodMode: null,
    personalPeriodStartDay: null,
    removedAt: null,
  },
  {
    id: 'm-dasha',
    householdId: 'h-demo',
    displayName: 'Даша',
    role: 'member',
    personalPeriodMode: 'month',
    personalPeriodStartDay: null,
    removedAt: null,
  },
];

const TAGS: Tag[] = [
  { id: 'tag-sochi', name: 'Отпуск в Сочи' },
  { id: 'tag-kitchen', name: 'Ремонт кухни' },
  { id: 'tag-birthday', name: 'День рождения Даши' },
  { id: 'tag-school', name: 'Школа' },
];

interface Draft {
  sub: string;
  type?: TransactionType;
  rub: number;
  author: string;
  comment?: string;
  tags?: string[];
  daysAgo: number;
}

/** Сценарий трат за один день (`daysAgo` дней назад). */
function dayDrafts(daysAgo: number, date: string, rnd: () => number): Draft[] {
  const { day } = parseIsoDate(date);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rnd() * items.length)] as T;
  const round = (min: number, max: number, step = 10) =>
    Math.round((min + rnd() * (max - min)) / step) * step;
  const who = () => pick(['m-alexey', 'm-maria', 'm-maria']);
  const drafts: Draft[] = [];
  const add = (d: Omit<Draft, 'daysAgo'>) => drafts.push({ ...d, daysAgo });

  if (day === 29)
    add({
      sub: 'sub-salary-2',
      type: 'income',
      rub: 95_000,
      author: 'm-alexey',
      comment: 'ООО «Ромашка»',
    });
  if (day === 14) add({ sub: 'sub-salary-1', type: 'income', rub: 40_000, author: 'm-alexey' });
  if (day === 5) add({ sub: 'sub-salary-2', type: 'income', rub: 72_000, author: 'm-maria' });
  if (day === 20) add({ sub: 'sub-salary-1', type: 'income', rub: 30_000, author: 'm-maria' });
  if (day === 25 && rnd() < 0.7)
    add({
      sub: 'sub-side-1',
      type: 'income',
      rub: round(5_000, 15_000, 500),
      author: 'm-alexey',
      comment: 'Сайт для соседа',
    });
  if (day === 2)
    add({
      sub: 'sub-other-income-1',
      type: 'income',
      rub: round(800, 2_400) + 0.35,
      author: 'm-maria',
      comment: 'Кэшбэк по карте',
    });

  if (rnd() < 0.55)
    add({
      sub: 'sub-food-1',
      rub: round(600, 4_800) + pick([0, 0, 0.9, 0.5]),
      author: who(),
      comment: pick(['', 'Пятёрочка', 'Перекрёсток', 'ВкусВилл']),
    });
  if (rnd() < 0.12)
    add({
      sub: 'sub-food-2',
      rub: round(500, 2_500, 50),
      author: 'm-maria',
      comment: 'Овощи и фрукты',
    });
  if (rnd() < 0.1) add({ sub: 'sub-food-3', rub: round(1_200, 3_500), author: who() });
  if (rnd() < 0.35)
    add({ sub: 'sub-cafe-1', rub: round(180, 420), author: pick(['m-alexey', 'm-dasha']) });
  if (rnd() < 0.2)
    add({
      sub: 'sub-cafe-2',
      rub: round(350, 800),
      author: 'm-alexey',
      comment: 'Обед с коллегами',
    });
  if (day % 7 === 3)
    add({ sub: 'sub-car-1', rub: round(2_200, 3_400), author: 'm-alexey', comment: 'АЗС' });
  if (rnd() < 0.06) add({ sub: 'sub-car-6', rub: round(100, 400, 50), author: 'm-alexey' });
  if (rnd() < 0.08)
    add({ sub: 'sub-transport-2', rub: round(250, 900), author: pick(['m-maria', 'm-dasha']) });
  if (rnd() < 0.12) add({ sub: 'sub-transport-1', rub: 70, author: 'm-dasha', comment: 'Метро' });
  if (rnd() < 0.05) add({ sub: 'sub-health-1', rub: round(300, 1_800), author: 'm-maria' });
  if (day === 10)
    add({ sub: 'sub-home-1', rub: round(6_200, 7_400) + 0.48, author: 'm-maria', comment: 'ЖКХ' });
  if (day === 12) add({ sub: 'sub-phone-1', rub: 850, author: 'm-maria' });
  if (day === 12)
    add({ sub: 'sub-phone-2', rub: 690, author: 'm-maria', comment: 'Домашний интернет' });
  if (day === 18) add({ sub: 'sub-phone-3', rub: 399, author: 'm-alexey', comment: 'Музыка' });
  if (day === 1)
    add({
      sub: 'sub-kids-1',
      rub: 4_500,
      author: 'm-maria',
      comment: 'Бассейн',
      tags: ['tag-school'],
    });
  if (day === 1 || day === 15)
    add({ sub: 'sub-kids-4', rub: 1_000, author: 'm-alexey', comment: 'Даше' });
  if (rnd() < 0.04) add({ sub: 'sub-kids-3', rub: round(700, 3_000, 50), author: 'm-maria' });
  if (rnd() < 0.04) add({ sub: 'sub-home-4', rub: round(400, 2_500), author: 'm-maria' });
  if (rnd() < 0.03)
    add({ sub: 'sub-fun-1', rub: round(1_200, 2_400, 100), author: 'm-alexey', comment: 'Кино' });

  // Сюжеты: отпуск 75–68 дней назад, ремонт кухни 40–20 дней назад, день рождения 9 дней назад.
  if (daysAgo === 75)
    add({
      sub: 'sub-fun-2',
      rub: 38_400,
      author: 'm-alexey',
      comment: 'Билеты на поезд',
      tags: ['tag-sochi'],
    });
  if (daysAgo === 74)
    add({
      sub: 'sub-fun-2',
      rub: 42_000,
      author: 'm-maria',
      comment: 'Гостиница',
      tags: ['tag-sochi'],
    });
  if (daysAgo <= 73 && daysAgo >= 68)
    add({ sub: 'sub-cafe-3', rub: round(2_500, 5_500, 100), author: who(), tags: ['tag-sochi'] });
  if (daysAgo === 70)
    add({
      sub: 'sub-fun-1',
      rub: 6_000,
      author: 'm-alexey',
      comment: 'Экскурсия',
      tags: ['tag-sochi'],
    });
  if (daysAgo === 38)
    add({
      sub: 'sub-home-3',
      rub: 24_500,
      author: 'm-alexey',
      comment: 'Плитка',
      tags: ['tag-kitchen'],
    });
  if (daysAgo === 30)
    add({
      sub: 'sub-home-3',
      rub: 18_000,
      author: 'm-alexey',
      comment: 'Работа мастера',
      tags: ['tag-kitchen'],
    });
  if (daysAgo === 22)
    add({
      sub: 'sub-home-4',
      rub: 12_990,
      author: 'm-maria',
      comment: 'Смеситель и полки',
      tags: ['tag-kitchen'],
    });
  if (daysAgo === 9)
    add({
      sub: 'sub-gifts-1',
      rub: 7_500,
      author: 'm-maria',
      comment: 'Велосипед',
      tags: ['tag-birthday'],
    });
  if (daysAgo === 9)
    add({
      sub: 'sub-cafe-3',
      rub: 6_800,
      author: 'm-alexey',
      comment: 'Праздник в кафе',
      tags: ['tag-birthday'],
    });
  if (daysAgo === 1)
    add({ sub: 'sub-car-2', rub: 8_900, author: 'm-alexey', comment: 'Замена масла' });
  return drafts;
}

/**
 * Создаёт демо-базу относительно текущей даты.
 *
 * @param today - «сегодня» в формате `YYYY-MM-DD` (параметр для тестов)
 */
export function createSeed(today: string = todayIso()): DbState {
  const createdAt = `${addDays(today, -130)}T09:00:00.000Z`;
  const { categories, subcategories } = defaultCategories();
  const rnd = random(20261017);
  const drafts = Array.from({ length: 125 }, (_, i) => 124 - i).flatMap((daysAgo) =>
    dayDrafts(daysAgo, addDays(today, -daysAgo), rnd),
  );
  const transactions: Transaction[] = drafts.map((d, i) => {
    const date = addDays(today, -d.daysAgo);
    const stamp = `${date}T${String(8 + (i % 12)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00.000Z`;
    return {
      id: `tx-${String(i + 1).padStart(4, '0')}`,
      type: d.type ?? 'expense',
      // Суммы черновиков заданы в рублях с не более чем 2 знаками: Math.round убирает погрешность float.
      amount: Math.round(d.rub * 100),
      subcategoryId: d.sub,
      date,
      comment: d.comment ?? '',
      tagIds: d.tags ?? [],
      authorId: d.author,
      createdAt: stamp,
      updatedAt: stamp,
      deletedAt: null,
    };
  });
  const budgets: Budget[] = [
    {
      id: 'b-daily',
      name: 'Ежедневные траты',
      amount: 4_000_000,
      items: [
        { kind: 'subcategory', subcategoryId: 'sub-food-1' },
        { kind: 'subcategory', subcategoryId: 'sub-food-2' },
        { kind: 'subcategory', subcategoryId: 'sub-cafe-1' },
        { kind: 'subcategory', subcategoryId: 'sub-cafe-2' },
      ],
      archivedAt: null,
      createdAt,
    },
    {
      id: 'b-car',
      name: 'Автомобиль',
      amount: 2_000_000,
      items: [{ kind: 'category', categoryId: 'cat-car' }],
      archivedAt: null,
      createdAt,
    },
    {
      id: 'b-kids',
      name: 'Дети',
      amount: 1_200_000,
      items: [{ kind: 'category', categoryId: 'cat-kids' }],
      archivedAt: null,
      createdAt,
    },
    {
      id: 'b-cafe',
      name: 'Кафе и рестораны',
      amount: 600_000,
      items: [{ kind: 'category', categoryId: 'cat-cafe' }],
      archivedAt: null,
      createdAt,
    },
  ];
  return {
    version: 1,
    household: { id: 'h-demo', name: 'Семья Ивановых', periodMode: 'cycle', periodStartDay: 29 },
    members: MEMBERS.map((m) => ({ ...m })),
    categories,
    subcategories,
    tags: TAGS.map((t) => ({ ...t })),
    transactions,
    budgets,
    currentMemberId: 'm-alexey',
  };
}
