# Шаг 6. Подключение сайта к Supabase

## Что изменилось

До этого шага сайт работал на мок-данных (всё хранилось в браузере). Теперь он
работает с настоящей базой Supabase, а мок-режим остался как «демо» — если сайт
собран без адреса сервера.

```text
Компонент → хук (useTransactions …) → features/<фича>/api/<фича>Api.ts (фасад)
                                          ├─ *.supabase.ts  — настоящий сервер (если есть ключи)
                                          └─ *.mock.ts      — демо на мок-данных
```

Фасад выбирает реализацию по `isSupabaseEnabled` (`src/shared/api/config.ts`):
есть `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` → Supabase, нет → мок.
Компоненты и хуки при этом **не менялись** — так было задумано ещё в ДЗ4.

## Новые файлы

| Файл | Зачем |
|------|-------|
| `shared/api/supabaseClient.ts` | один клиент Supabase на всё приложение, только ключ `anon` |
| `shared/api/supabaseErrors.ts` | коды ошибок базы (P0403, 23505 …) → понятные сообщения на русском |
| `shared/api/supabaseRpc.ts` | вызов RPC-функций с проверкой типов ответа (`unknown` → сужение) |
| `shared/api/supabaseRows.ts` | перевод строк таблиц (snake_case) в типы приложения; деньги — строкой → копейки |
| `shared/api/events.ts` | шина «данные изменились» — экраны перезагружают данные |
| `features/*/api/*.supabase.ts` | запросы к таблицам и RPC для каждой фичи |
| `features/household/hooks/useRealtime.ts` | Supabase Realtime: операции другого участника появляются сразу |
| `features/auth/*` | вход, регистрация, сброс пароля, выход, защита страниц (`RequireAuth`) |
| `pages/LoginPage`, `SignupPage`, `ResetPasswordPage`, `UpdatePasswordPage` | экраны авторизации |
| `pages/OnboardingPage` | создание семьи после первой регистрации |
| `pages/InvitePage` | вход по ссылке-приглашению |
| `settings/InviteDialog`, `AccountCard`, `DeleteHouseholdCard` | приглашение, выход из семьи, удаление семьи |
| `supabase/migrations/20261017150000_app_integration.sql` | `merge_tags`, `leave_household`, `delete_household`, Realtime |

## Путь пользователя

1. Регистрация (email + пароль) → письмо «подтвердите почту».
2. Ссылка из письма → сайт, пользователь уже вошёл.
3. Нет семьи → экран «Создать семью» (сервер создаёт 15 категорий и 42 подкатегории).
4. Работа с операциями, отчётами, бюджетами — всё уходит в базу.
5. Настройки → «Пригласить» → ссылка `…/invite/<код>` → второй человек регистрируется
   и попадает в ту же семью.

## Безопасность

- В браузере только публичный ключ `anon` (`sb_publishable_…`); `service_role` нигде нет.
- Ключи не в коде: локально — `.env.local` (в `.gitignore`), онлайн — переменные
  репозитория GitHub (`Settings → Secrets and variables → Actions → Variables`).
- Даже если кто-то изменит код сайта, чужие данные он не получит — их не отдаст
  сама база (RLS, шаг 5).

## Проверка

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Результат: 22 тест-файла, 107 тестов — все проходят; линтер и TypeScript без ошибок.
