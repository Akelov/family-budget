import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const out = process.argv[2]; const file = 'file://' + process.cwd() + '/dist/index.html';
const routes = [['operations', 'ops'], ['add', 'add'], ['reports', 'reports'], ['reports_auto', 'reports-auto'], ['reports_tags', 'reports-tags'],
  ['plan', 'plan'], ['plan_new', 'plan-new'], ['settings', 'settings'], ['settings_categories', 'settings-categories'], ['settings_members', 'settings-members']];
const b = await chromium.launch(); const errs = [];
for (const [vw, vh, tag] of [[390, 844, 'mobile'], [1280, 900, "desktop"]]) {
  const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  for (const [name, route] of routes) {
    await p.goto(file + '#' + route); await p.waitForTimeout(250);
    const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (over) errs.push(`${tag}/${name}: горизонтальный скролл`);
    await p.screenshot({ path: `${out}/${name}_${tag}.png` });
  }
  await p.close();
}
await b.close(); console.log(JSON.stringify(errs));
