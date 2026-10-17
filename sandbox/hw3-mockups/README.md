# hw3-mockups — макеты всех экранов

Кликабельный прототип «Семейного бюджета» в стиле итоговой UI-концепции 4
(дизайн-токены сняты с проекта в v0.dev). React + CSS, мок-данные, без логики.

Экраны (якорь в адресе): `#ops` операции · `#add` новая операция · `#reports` отчёты ·
`#reports-auto` раскрытие категории · `#reports-tags` теги · `#plan` бюджеты ·
`#plan-new` новый бюджет · `#settings` настройки · `#settings-categories` · `#settings-members`.

```bash
npm install
node build.mjs              # dist/index.html — открыть в браузере
node shots.mjs <папка>      # скриншоты всех экранов: 390 и 1280 px (нужен Playwright)
```
