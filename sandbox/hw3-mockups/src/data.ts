// Мок-данные для макетов (вымышленные)

export type IconName =
  | 'wallet' | 'basket' | 'car' | 'coffee' | 'house' | 'baby' | 'bus' | 'heart'
  | 'phone' | 'ticket' | 'shirt' | 'gift' | 'briefcase' | 'more';

export interface Member { id: string; name: string; role: 'Владелец' | 'Администратор' | 'Участник'; color: string; }

export const MEMBERS: Member[] = [
  { id: 'a', name: 'Алексей', role: 'Владелец', color: '#33875c' },
  { id: 'm', name: 'Марина', role: 'Администратор', color: '#c2618b' },
  { id: 'd', name: 'Даня', role: 'Участник', color: '#4c7fd1' },
];

export const CAT_COLORS: Record<string, string> = {
  'Дом': '#33875c',
  'Продукты': '#e0a43a',
  'Автомобиль': '#4c7fd1',
  'Дети': '#c2618b',
  'Кафе': '#8a6fd1',
  'Прочее': '#9aa59f',
};

export const EXPENSE_CATEGORIES: { name: string; icon: IconName; subs: string[] }[] = [
  { name: 'Продукты', icon: 'basket', subs: ['Супермаркет', 'Рынок', 'Доставка'] },
  { name: 'Кафе', icon: 'coffee', subs: ['Кофе', 'Обеды', 'Рестораны'] },
  { name: 'Дом', icon: 'house', subs: ['Коммунальные услуги', 'Аренда', 'Ремонт', 'Товары для дома'] },
  { name: 'Автомобиль', icon: 'car', subs: ['Топливо', 'Обслуживание', 'Запчасти', 'Штрафы', 'Платные дороги', 'Парковка'] },
  { name: 'Транспорт', icon: 'bus', subs: ['Общественный', 'Такси'] },
  { name: 'Здоровье', icon: 'heart', subs: ['Аптека', 'Врачи'] },
  { name: 'Дети', icon: 'baby', subs: ['Кружки', 'Одежда', 'Игрушки', 'Карманные деньги'] },
  { name: 'Связь', icon: 'phone', subs: ['Мобильная связь', 'Интернет', 'Подписки'] },
];

export interface Tx { id: string; date: string; cat: string; sub: string; icon: IconName; comment?: string; tags?: string[]; author: string; amount: number; }

export const DAYS: { title: string; total: number; items: Tx[] }[] = [
  { title: 'Среда, 14 октября 2026 г.', total: 89050, items: [
    { id: '1', date: '14 окт.', cat: 'Доходы', sub: 'Зарплата', icon: 'wallet', author: 'Алексей', amount: 95000 },
    { id: '2', date: '14 окт.', cat: 'Продукты', sub: 'Супермаркет', icon: 'basket', comment: 'Закупка на неделю', author: 'Марина', amount: -3450 },
    { id: '3', date: '14 окт.', cat: 'Автомобиль', sub: 'Топливо', icon: 'car', comment: 'АЗС', tags: ['Отпуск в Сочи'], author: 'Алексей', amount: -2500 },
  ] },
  { title: 'Вторник, 13 октября 2026 г.', total: -8160, items: [
    { id: '4', date: '13 окт.', cat: 'Кафе', sub: 'Кофе', icon: 'coffee', author: 'Даня', amount: -320 },
    { id: '5', date: '13 окт.', cat: 'Дом', sub: 'Коммунальные услуги', icon: 'house', author: 'Алексей', amount: -7840 },
  ] },
];

export const REPORT_CATS = [
  { name: 'Дом', sum: 32000, pct: 28 },
  { name: 'Продукты', sum: 27450, pct: 24 },
  { name: 'Автомобиль', sum: 20400, pct: 18 },
  { name: 'Дети', sum: 14000, pct: 12 },
  { name: 'Кафе', sum: 9800, pct: 9 },
  { name: 'Прочее', sum: 8690, pct: 9 },
];

export const AUTO_SUBS = [
  { name: 'Топливо', sum: 12500, pct: 61, color: '#4c7fd1' },
  { name: 'Обслуживание', sum: 4800, pct: 24, color: '#7fa3e0' },
  { name: 'Платные дороги', sum: 2600, pct: 13, color: '#a9c0ea' },
  { name: 'Штрафы', sum: 500, pct: 2, color: '#d3def4' },
];

export const TAGS = [
  { name: 'Отпуск в Сочи', sum: 36700, count: 9 },
  { name: 'Ремонт', sum: 18200, count: 4 },
  { name: 'День рождения Дани', sum: 7400, count: 3 },
];

export const BUDGETS = [
  { name: 'Ежедневные траты', subs: 'Продукты › Супермаркет, Рынок · Кафе › Кофе, Обеды', spent: 58700, limit: 80000 },
  { name: 'Автомобиль', subs: 'Автомобиль (вся категория)', spent: 20400, limit: 24000 },
  { name: 'Развлечения', subs: 'Развлечения › Кино и события, Хобби', spent: 13000, limit: 12000 },
];

const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
export const rub = (n: number) => `${fmt.format(Math.abs(n)).replace(/ /g, ' ')} ₽`;
export const signed = (n: number) => `${n > 0 ? '+' : '−'}${rub(n)}`;
