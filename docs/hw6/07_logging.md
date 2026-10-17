# Шаг 7. Логирование

## Формат записи — JSON

Каждое событие — одна JSON-строка с одинаковыми полями в браузере и на сервере:

```json
{
  "level": "warning",
  "time": "2026-10-18T10:15:02.114Z",
  "version": "0a5aa8e",
  "screen": "reports",
  "code": "load_retry",
  "message": "Повтор 1: network"
}
```

| Поле | Что это |
|------|---------|
| `level` | уровень: `info`, `warning`, `error` |
| `time` | время в UTC (ISO 8601) |
| `version` | первые 7 символов коммита — **после какой публикации** появилась запись (пайплайн передаёт `VITE_APP_VERSION = github.sha`) |
| `screen` | раздел сайта: `reports`, `plan`, `settings`, … |
| `code` | машинный код события — по нему группируем |
| `message` | техническое сообщение **без личных данных**: без сумм, комментариев, имён, email |

## Уровни

| Уровень | Когда | Коды |
|---------|-------|------|
| `info` | для сведения | `test_entry` — проверочная запись (Настройки → Для разработчика) |
| `warning` | сбой, с которым сайт **справился сам** | `load_retry` — повтор загрузки после сбоя сети/сервера; `chunk_load` — устаревшая вкладка после деплоя, страница перезагрузилась |
| `error` | **настоящая ошибка**, нужен разработчик | `ui_crash` — упал раздел; `uncaught`, `unhandled_rejection` — исключение вне React; `db_<код>` — неизвестный ответ базы; `load_failed` — сбой разбора ответа |

## Где хранятся логи (централизованно)

| Источник | Что пишет | Где смотреть |
|----------|-----------|--------------|
| **Сайт (браузер)** | `info` / `warning` / `error` из `shared/lib/logger.ts` | консоль браузера (F12) + таблица **`client_errors`** в Supabase — одно место для ошибок всех пользователей |
| **Функция `/api/health`** | `info` (всё в порядке + время ответа), `warning` (что-то недоступно) | **Vercel → проект → Logs** (фильтр по `level`, `event`) |
| **Supabase** | запросы API, ошибки Postgres, вход | Supabase → **Logs** (API Gateway, Postgres, Auth) |
| **GitHub Actions** | сборка, тесты, деплой, почасовой health check | вкладка **Actions** репозитория |
| **UptimeRobot** | доступность каждые 5 минут, инциденты | панель UptimeRobot, письма |

Изменения в базе — [миграция 6](../../supabase/migrations/20261018100000_logging.sql):
уровень `info`, колонка `app_version`, индекс по времени. Права прежние: пользователь только
добавляет записи, читает журнал лишь владелец проекта.

## SQL-запросы для разбора журнала (Supabase → SQL Editor)

**1. Последние записи**

```sql
select created_at, level, app_version, screen, code, message
from public.client_errors
order by created_at desc
limit 50;
```

**2. Что ломается чаще всего за сутки**

```sql
select level, code, screen, count(*) as times,
       min(created_at) as first_seen, max(created_at) as last_seen,
       array_agg(distinct app_version) as versions
from public.client_errors
where created_at > now() - interval '24 hours'
group by level, code, screen
order by (level = 'error') desc, times desc;
```

**3. Новые ошибки после последней публикации** (есть в новой версии, не было в прошлых)

```sql
with latest as (
  select app_version from public.client_errors
  where app_version is not null order by created_at desc limit 1
)
select code, screen, count(*) as times, max(message) as example
from public.client_errors
where app_version = (select app_version from latest)
  and code not in (
    select code from public.client_errors
    where app_version is distinct from (select app_version from latest)
  )
group by code, screen;
```

**4. Выгрузка для AI** — копируется в промпт целиком

```sql
select json_agg(t order by t.created_at) as logs
from (
  select created_at, level, app_version, screen, code, message
  from public.client_errors
  where created_at > now() - interval '24 hours'
) t;
```

## Промпты для анализа логов с помощью AI

Шаблон RTCF из ДЗ2; правила проекта агент берёт из CLAUDE.md.

**Промпт 1. Разбор журнала за сутки**

```markdown
## Role
Ты — senior-инженер поддержки веб-приложения «Семейный бюджет» (React + Supabase + Vercel).
## Task
Проанализируй журнал ошибок и найди проблемы, которые нужно чинить.
## Context
Формат: JSON, поля level, time, version, screen, code, message.
Уровни: info — для сведения, warning — сайт справился сам, error — нужна починка.
Коды: load_retry, chunk_load, ui_crash, uncaught, unhandled_rejection, db_<SQLSTATE>, load_failed.
Журнал: <вставить результат запроса 4>
## Format
Таблица: проблема | сколько раз | раздел | версия | вероятная причина | что проверить.
Отдельно: что можно игнорировать и почему. Не придумывай причины без данных — пиши «нужна проверка».
```

**Промпт 2. Связь с публикацией**

```markdown
## Task
После публикации версии <abc1234> выросло число warning/error. Найди, какие коды появились
или участились, и сопоставь их с изменениями коммита.
## Context
Журнал (запрос 2 и 3): <вставить>. Изменения коммита: <git show --stat abc1234>.
## Format
1) что изменилось в журнале; 2) какой файл коммита вероятно виноват; 3) как проверить; 4) откат или исправление.
```

**Промпт 3. Одна ошибка подробно**

```markdown
## Task
Объясни ошибку и предложи исправление с тестом.
## Context
Запись журнала: <JSON>. Строки Supabase Logs за ту же минуту: <вставить>. Файл: <путь>.
## Format
Причина одной фразой → как воспроизвести → исправление → unit-тест, который её поймает.
```

## Проверка анализа на типичных ошибках

Учебный журнал [logs/sample_journal.json](logs/sample_journal.json): записи `chunk_load`,
`db_42501` и `test_entry` повторяют реальные случаи ДЗ5–ДЗ6, а `load_retry` и `ui_crash`
добавлены искусственно — проверить, отличает ли AI шум от настоящей ошибки. Разбор по промпту 1:

| Проблема | Раз | Где | Причина (вывод AI) | Итог |
|----------|-----|-----|--------------------|------|
| `chunk_load` warning ×3 сразу после смены `version` | 3 | reports, plan | вкладки, открытые до деплоя, запрашивают удалённые файлы разделов | уже лечится автоперезагрузкой; рост после каждого деплоя — норма, если затем пропадает |
| `db_42501` error в Postgres-логе `permission denied for table client_errors` | 1 | login | запись журнала от гостя: у роли `anon` нет прав на таблицу | **исправлено** — гость не пишет в журнал (шаг 7 ДЗ5) |
| `load_retry` warning ×2 без последующей ошибки | 2 | operations | кратковременный сбой сети, повтор помог | игнорировать; тревога, если > 20 в час |
| `ui_crash` с `TypeError: Cannot read properties of undefined` | 1 | reports | ошибка в коде раздела — **нужна починка**, по одной записи причину не установить | промпт 3 + запрос `details` у пользователя |
| `test_entry` info | 3 | settings | проверочные записи | игнорировать |

AI правильно отделил «шум» (`info`, единичные `load_retry`, `chunk_load` после деплоя) от того,
что требует действий (`ui_crash`), и не стал выдумывать причину там, где данных мало.

## Тесты

| Файл | Что проверяет |
|------|---------------|
| `shared/lib/logger.test.ts` | формат JSON-записи, обрезка полей до лимитов таблицы, версия `dev` локально, выбор метода консоли по уровню, лимит 20 записей |
| `api/_lib/log.test.ts` | серверная JSON-строка; поля `data` не подменяют уровень и источник |
| `api/_lib/health.test.ts` | логика проверки здоровья (шаг 6) |
