# hw1-test — тестовый проект ДЗ1

Проверка работы AI-агента Claude Code на маленькой задаче проекта «Семейный бюджет»:
функции форматирования денег и дат и React-компонент `TransactionCard`.

## Запуск

```bash
npm install
npm test        # 9 автотестов (node:test + tsx)
npm run demo    # собирает demo/bundle.js, затем открыть demo/index.html в браузере
```

## Файлы

- `src/format.ts` — `formatMoney`, `formatSignedAmount`, `formatShortDate`
- `src/TransactionCard.tsx` — карточка операции (доход/расход, удаление)
- `tests/` — тесты функций и компонента
- `demo/` — демо-страница с мок-данными
