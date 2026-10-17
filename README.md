# Семейный бюджет

Веб-приложение для совместного учёта доходов и расходов семьи — аналог мобильных
приложений учёта бюджета. Члены семьи записывают операции с категорией и подкатегорией,
тегами и комментарием, смотрят отчёты и следят за бюджетами.

Учебный проект: разработка с помощью AI-агента (Claude). Правила агента — [CLAUDE.md](CLAUDE.md).

**Онлайн-версия:** https://family-budget-sable-nu.vercel.app (публикуется автоматически из ветки `main` после всех проверок).
**Состояние сервиса:** https://family-budget-sable-nu.vercel.app/api/health

## Что умеет

| Раздел | Возможности |
|---|---|
| **Вход** | Регистрация по email с подтверждением почты, **вход через Google**, сброс пароля, выход |
| **Семья** | Создание семьи (сразу 15 категорий и 42 подкатегории), приглашение по ссылке, роли «Владелец», «Администратор», «Участник», выход из семьи, удаление семьи |
| **Операции** | Период (месяц, свой цикл с дня N, произвольный диапазон), сводка «Доход / Расход / Остаток», история по дням, поиск, фильтры, добавление, изменение и удаление с отменой. Операции другого члена семьи появляются сразу (Realtime) |
| **Отчёты** | Кольцевая диаграмма и список с долями, раскрытие категории до подкатегорий, вкладка «Теги» |
| **План** | Бюджеты: потрачено, осталось, статусы «В норме» / «Почти у лимита» / «Превышен» |
| **Настройки** | Профиль, период семьи, категории и подкатегории, теги (переименование, объединение), участники и роли |

Телефон — нижняя панель с кнопкой «+», десктоп (от 1024 px) — верхняя панель и таблица операций.

## Backend (ДЗ5)

Данные хранятся в **Supabase**: PostgreSQL с правилами доступа Row Level Security, вход
через Supabase Auth, REST API и серверные функции, Realtime. Своего сервера нет.
Полная документация — **[docs/hw5/backend_documentation.md](docs/hw5/backend_documentation.md)**:
архитектура, развёртывание, API endpoints, примеры запросов, процесс разработки с AI.

```text
Браузер (React, Vercel) ──HTTPS + токен──▶ Supabase: Auth · REST/RPC · Realtime
                                                     └─▶ PostgreSQL (11 таблиц, RLS)
```

Без ключей Supabase сайт запускается в **демо-режиме** на мок-данных (как в ДЗ4).

## Стек

React 19 · TypeScript (strict) · Vite 7 · Tailwind CSS 4 · React Router 7 · Recharts 3 ·
lucide-react · Supabase (PostgreSQL, Auth, RLS, Realtime, `@supabase/supabase-js`) ·
Vitest 4 + Testing Library · ESLint 9 + Prettier · GitHub Actions · Vercel · Google OAuth ·
Яндекс.Метрика · UptimeRobot · Dependabot.

## Запуск

Нужен [Node.js](https://nodejs.org) 20.19 или новее (рекомендуется 22 LTS, см. `.nvmrc`).

```bash
git clone https://github.com/Akelov/family-budget.git
cd family-budget
npm install
cp .env.example .env.local   # вписать адрес Supabase и публичный ключ (без этого файла — демо-режим)
npm run dev                  # http://localhost:5173 — с горячей перезагрузкой
```

Как создать свою базу в Supabase (4 миграции, настройки входа) — раздел «Развёртывание»
в [backend_documentation.md](docs/hw5/backend_documentation.md#2-развёртывание).

| Команда | Что делает |
|---|---|
| `npm run dev` | локальный сервер разработки с hot reload |
| `npm test` | все автотесты (Vitest) |
| `npm run test:watch` | тесты в режиме наблюдения |
| `npm run lint` | ESLint |
| `npm run typecheck` | проверка типов TypeScript |
| `npm run build` | сборка в папку `dist` |
| `npm run preview` | просмотр собранной версии на http://localhost:4173 |

## Структура

```text
src/
  app/          точка входа, роутер, каркас (верхняя и нижняя панели)
  pages/        страницы-маршруты: Операции, Отчёты, План, Настройки
  features/     фичи: transactions, reports, budgets, period, categories, tags, household, settings
    <фича>/api         запросы к «серверу» (в ДЗ5 — Supabase)
    <фича>/model       чистая бизнес-логика и её unit-тесты
    <фича>/hooks       хуки фичи
    <фича>/components  компоненты фичи
  shared/       общие UI-компоненты, утилиты (деньги, даты), клиент Supabase, мок-сервер, типы
  test/         настройка тестов, фикстуры, рендер приложения
supabase/
  migrations/   миграции базы: схема, функции API, правила RLS, интеграция
  local/        проверка миграций на локальном PostgreSQL
  tests/        endpoints_check.sql — проверка всех запросов к серверу (70 проверок)
```

Деньги считаются в копейках (целые числа), даты — строками `YYYY-MM-DD` без часовых поясов.

## Деплой, интеграции и эксплуатация (ДЗ6)

Каждый push в `main` запускает [GitHub Actions](.github/workflows/ci.yml): Prettier → ESLint →
TypeScript → тесты → `npm audit` → сборка → публикация на **Vercel** → smoke test
(страницы и `/api/health`). Pull Request получает отдельный preview-адрес. Сайт обновляется
только если все проверки прошли.

| Что | Чем |
|-----|-----|
| Вход через Google | Supabase Auth + Google OAuth 2.0 |
| Аналитика | Яндекс.Метрика: просмотры страниц и 10 событий без личных данных |
| Мониторинг | `/api/health` (сайт, вход, база) → UptimeRobot каждые 5 минут + GitHub Actions каждый час |
| Логи | JSON, уровни info / warning / error, версия сборки; таблица `client_errors`, Vercel Logs |
| Безопасность | CSP и защитные заголовки, `npm audit` в пайплайне, Dependabot, Secret Protection, RLS |

Полная документация — **[docs/hw6/integration_documentation.md](docs/hw6/integration_documentation.md)**,
отчёт по безопасности — [docs/hw6/02_security_audit.md](docs/hw6/02_security_audit.md).

## Домашние задания

| ДЗ | Тема | Материалы |
|---|---|---|
| 1 | Выбор и настройка AI-инструмента | [docs/hw1](docs/hw1/report.md) |
| 2 | Правила для агента и промпт-шаблоны | [docs/hw2](docs/hw2/hw_ai_rules.md) |
| 3 | UI-концепции, User Stories, ТЗ | [docs/hw3](docs/hw3/README.md) |
| 4 | Frontend-приложение с AI-агентом | [отчёт о разработке](docs/hw4/development_report.md), [промпты](docs/hw4/prompts.md), [скриншоты](docs/hw4/screenshots) |
| 5 | Backend (Supabase) и интеграция | [документация backend](docs/hw5/backend_documentation.md), [проверка API](docs/hw5/08_api_testing.md), [памятка по отладке](docs/hw5/debug_playbook.md), [отчёт Word](docs/hw5/ДЗ5_отчёт.docx) |
| 6 | CI/CD и интеграция сервисов | [документация интеграций](docs/hw6/integration_documentation.md), [отчёт по безопасности](docs/hw6/02_security_audit.md), [отчёт Word](docs/hw6/ДЗ6_отчёт.docx) |
