// Скриншоты всех экранов на разных ширинах + проверка горизонтальной прокрутки и ошибок консоли.
// Запуск: npm run build && npm run preview, затем в другом окне:
//   node scripts/screenshots.mjs docs/hw4/screenshots
// Нужен Playwright (npx playwright install chromium) — в проект как зависимость не входит.
import { chromium } from 'playwright';

const [, , out = 'screenshots', base = 'http://localhost:4173'] = process.argv;
const browser = await chromium.launch();
const log = [];

async function open(width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
  });
  const page = await context.newPage();
  page.on('console', (m) => {
    // Шрифт с Google Fonts может не загрузиться в закрытой сети — это не ошибка приложения.
    if (['error', 'warning'].includes(m.type()) && !m.text().includes('ERR_TUNNEL')) {
      log.push(`${width}px [${m.type()}] ${m.text()}`);
    }
  });
  page.on('pageerror', (e) => log.push(`${width}px [pageerror] ${e.message}`));
  return [context, page];
}

const settle = (page) => page.waitForTimeout(1600);

async function shot(page, name) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) log.push(`${name}: горизонтальная прокрутка ${overflow}px`);
  await page.screenshot({ path: `${out}/${name}.png` });
}

/** Все кнопки открытого окна должны помещаться в его границы (замечание: «Показать» и «Сохранить» вылезали). */
async function checkDialog(page, name) {
  const problems = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return ['окно не открылось'];
    const box = dialog.getBoundingClientRect();
    return [...dialog.querySelectorAll('button')]
      .filter((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && (r.left < box.left - 0.5 || r.right > box.right + 0.5);
      })
      .map((b) => `кнопка «${b.textContent?.trim() || b.getAttribute('aria-label')}» выходит за окно`);
  });
  problems.forEach((p) => log.push(`${name}: ${p}`));
  await shot(page, name);
}

const PAGES = [
  ['operations', '/'],
  ['reports', '/reports'],
  ['plan', '/plan'],
  ['settings', '/settings'],
  ['settings_categories', '/settings/categories'],
];

for (const [label, width, height] of [
  ['mobile', 390, 844],
  ['desktop', 1280, 900],
]) {
  const [context, page] = await open(width, height);
  for (const [name, path] of PAGES) {
    await page.goto(base + path);
    await settle(page);
    await shot(page, `${name}_${label}`);
  }
  await page.goto(`${base}/reports?category=cat-car`);
  await settle(page);
  await shot(page, `reports_drill_${label}`);

  await page.goto(`${base}/`);
  await settle(page);
  const addName = label === 'mobile' ? 'Добавить операцию' : 'Добавить';
  await page.getByRole('button', { name: addName, exact: true }).first().click();
  await settle(page);
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await page.waitForTimeout(300);
  await shot(page, `form_errors_${label}`);
  await page.getByLabel('Сумма', { exact: true }).fill('2 500');
  await page.getByRole('radio', { name: 'Автомобиль' }).click();
  await page.getByRole('radio', { name: 'Топливо' }).click();
  await page.waitForTimeout(300);
  await shot(page, `form_filled_${label}`);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /Фильтры/ }).click();
  await settle(page);
  await shot(page, `filters_${label}`);
  await page.keyboard.press('Escape');

  await page.goto(`${base}/plan`);
  await settle(page);
  await page.getByRole('button', { name: 'Бюджет', exact: true }).first().click();
  await settle(page);
  await shot(page, `budget_form_${label}`);
  await context.close();
}

// Окна в режиме изменения: здесь в футере две кнопки рядом.
for (const [label, width, height] of [
  ['mobile', 360, 740],
  ['desktop', 1280, 900],
]) {
  const [context, page] = await open(width, height);
  await page.goto(`${base}/`);
  await settle(page);
  await page.getByRole('button', { name: /Фильтры/ }).click();
  await settle(page);
  await checkDialog(page, `dialog_filters_${label}`);
  await page.keyboard.press('Escape');
  await page.locator(label === 'mobile' ? 'li button' : 'tbody tr[tabindex]').first().click();
  await settle(page);
  await checkDialog(page, `dialog_edit_operation_${label}`);
  await page.keyboard.press('Escape');
  await page.goto(`${base}/plan`);
  await settle(page);
  await page.getByRole('button', { name: /Изменить бюджет/ }).first().click();
  await settle(page);
  await checkDialog(page, `dialog_edit_budget_${label}`);
  await page.keyboard.press('Escape');
  await page.goto(`${base}/settings/categories`);
  await settle(page);
  await page.getByRole('button', { name: /^Продукты/ }).click();
  await settle(page);
  await checkDialog(page, `dialog_edit_category_${label}`);
  await context.close();
}

for (const [width, height] of [
  [360, 740],
  [768, 1024],
  [1024, 768],
  [1440, 900],
]) {
  const [context, page] = await open(width, height);
  for (const [name, path] of PAGES) {
    await page.goto(base + path);
    await settle(page);
    await shot(page, `w${width}_${name}`);
  }
  await context.close();
}

{
  const [context, page] = await open(390, 844);
  await page.goto(`${base}/`);
  await settle(page);
  await page.evaluate(() => localStorage.setItem('family-budget:fail', 'server'));
  await page.goto(`${base}/`);
  await page.waitForTimeout(6000);
  await shot(page, 'error_server_mobile');
  // Выход из имитации ошибок прямо с экрана ошибки.
  await page.getByRole('button', { name: 'Выключить имитацию' }).click();
  await settle(page);
  const isRecovered = await page.getByRole('heading', { name: 'Операции' }).isVisible();
  if (!isRecovered) log.push('после «Выключить имитацию» приложение не загрузилось');
  await context.close();
}

await browser.close();
console.log(log.join('\n') || 'ok: ошибок в консоли нет, горизонтальной прокрутки нет');
