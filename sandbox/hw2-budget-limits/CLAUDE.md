# Песочница ДЗ2: модуль лимитов бюджета

Действуют все правила из корневого `CLAUDE.md`. Особенности этой папки:

- Здесь нет доступа к npm-реестру, поэтому Vitest недоступен. Тесты пишутся
  на встроенном `node:test` + `node:assert/strict` (API близок к Vitest:
  `test`, `describe`, `assert.equal`, `assert.deepEqual`, `assert.throws`).
- Зависимости уже установлены. Запуск тестов: `npm test`, проверка типов: `npm run typecheck`.
- Не запускай `npm install`.
- Уже есть: `src/shared/lib/types.ts` (тип `Transaction`) и `src/shared/lib/format.ts` (`formatMoney`).
