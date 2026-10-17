# 10 частых проблем бэкенда: как найти причину

Памятка для проекта «Семейный бюджет» (Supabase + React). Для каждой проблемы:
**признак** → **команда или место, где смотреть** → **промпт для AI-агента**.
Все примеры взяты из реальной работы над ДЗ5.

Общий шаблон промпта для отладки (RTCF из ДЗ2, CLAUDE.md правила 1–3):

```markdown
## Role
Ты — senior backend-разработчик (PostgreSQL, Supabase, RLS), правила CLAUDE.md.
## Task
Найди причину ошибки и предложи минимальное исправление. Сначала гипотезы, потом проверка.
## Context
Что делал: <действие на сайте или SQL>. Ошибка: <код, текст, HTTP-статус>.
Строки журнала Supabase: <вставить>. Файлы: <миграция / компонент>.
## Format
1) причина одной фразой; 2) как проверить; 3) исправление (SQL или код целиком);
4) тест, который поймает эту ошибку в будущем.
```

---

## 1. `401` / `42501 permission denied for table …`

**Признак:** запрос с сайта или `curl` возвращает HTTP 401 и код `42501`.
**Причина:** запрос пришёл без входа (роль `anon`), а у `anon` нет прав на таблицу — так и задумано.

```bash
# Есть ли токен входа в запросе? Без Authorization это гость.
curl "$URL/rest/v1/categories?select=name" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $USER_TOKEN"
```

> **Промпт:** «Запрос `GET /rest/v1/categories` возвращает 401 `42501`. Пользователь вошёл?
> Проверь, передаёт ли supabase-js токен, и не вызывается ли запрос до восстановления сессии.»

⚠️ Подсказку Supabase `GRANT SELECT … TO anon` **не выполнять** — она откроет данные всем.

## 2. Пустой ответ `[]` вместо данных

**Признак:** запрос успешный (200), но строк нет, хотя в Table Editor они есть.
**Причина:** RLS: пользователь не состоит в семье или смотрит чужие данные. Table Editor
показывает всё, потому что работает от владельца базы.

```sql
-- Проверить от имени пользователя (SQL Editor):
select set_config('request.jwt.claims', json_build_object('sub', '<user-id>', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.my_household_id(), count(*) from public.transactions;
```

> **Промпт:** «Пользователь <id> видит 0 операций. Вот политики RLS таблицы transactions и
> строка в members. Объясни, какое условие политики не выполняется.»

## 3. `new row violates row-level security policy` (42501 при записи)

**Признак:** добавление не проходит, хотя чтение работает.
**Причина:** у роли нет политики `INSERT` (например, участник создаёт категорию — по ТЗ можно
только владельцу и администратору) или `with check` не совпадает с `household_id`.

> **Промпт:** «INSERT в budgets от участника с ролью member падает с 42501. По матрице прав ТЗ §3.2
> это должно быть запрещено? Если да — покажи, как вывести понятное сообщение на сайте.»

## 4. `23503 violates foreign key constraint`

**Признак:** удаление падает. **Реальный случай:** удаление семьи — каскад удалял категории
раньше бюджетов, которые на них ссылаются (`budget_items_category_id_fkey`).
**Решение:** функция `delete_household()`, которая удаляет в правильном порядке.

```sql
select conname, confdeltype from pg_constraint where conrelid = 'public.budget_items'::regclass;
-- confdeltype: a = no action, r = restrict, c = cascade
```

> **Промпт:** «DELETE семьи падает на `budget_items_category_id_fkey`. Покажи цепочку внешних
> ключей и порядок удаления, при котором ограничения не нарушаются.»

## 5. `23505 duplicate key` — дубликат

**Признак:** 409 Conflict в журнале API Gateway. Сайт должен показать «Такое название уже есть».

```sql
select indexname, indexdef from pg_indexes where tablename = 'categories';
```

> **Промпт:** «Пришёл 23505 по `categories_unique_name`. Проверь, что сайт переводит его в
> понятный текст (supabaseErrors.ts), и что сравнение без учёта регистра совпадает на сайте и в базе.»

## 6. `PGRST202 Could not find the function … in the schema cache`

**Признак:** вызов RPC возвращает 404.
**Причины:** неверные имена параметров (`p_from` вместо `from`), миграция с функцией не применена,
или PostgREST не перечитал схему.

```sql
select proname, pg_get_function_arguments(oid) from pg_proc where proname = 'list_transactions';
notify pgrst, 'reload schema';   -- перечитать схему после изменения функций
```

> **Промпт:** «RPC create_household отвечает PGRST202. Вот сигнатура функции и тело запроса —
> найди расхождение в именах параметров.»

## 7. Сессия есть, но `auth.uid()` = null / `P0401`

**Признак:** функции отвечают «Нужно войти в аккаунт», хотя пользователь вошёл.
**Причина:** токен истёк или запрос ушёл до восстановления сессии из localStorage.

```text
DevTools (F12) → Application → Local Storage → https://akelov.github.io →
ключ sb-itijdbhguzsqggowfgbn-auth-token → поле expires_at (время окончания, Unix-секунды).
DevTools → Network → любой запрос к supabase.co → заголовок Authorization: Bearer … есть?
```

> **Промпт:** «После обновления страницы первый запрос получает P0401. Как дождаться
> восстановления сессии в AuthProvider до первых запросов?»

## 8. Письмо подтверждения ведёт на `localhost:3000`

**Признак:** ссылка из письма открывает несуществующий адрес.
**Причина:** не настроены Site URL и Redirect URLs (Authentication → URL Configuration).
**Решение:** Site URL `https://akelov.github.io/family-budget/`, Redirect `…/family-budget/**`.

> **Промпт:** «Письмо подтверждения Supabase ведёт на localhost:3000. Где задать адрес сайта
> и как передать `emailRedirectTo` при регистрации?»

## 9. Конфликт версий `P0409` и «пропавшие» изменения

**Признак:** «Операция была изменена другим участником».
**Причина:** два человека редактируют одну операцию; сервер сравнивает `updated_at`.

```sql
select id, updated_at, deleted_at from public.transactions where id = '<id>';
```

> **Промпт:** «Пользователь получает P0409 без второго редактора. Проверь, не отправляет ли
> форма устаревший updated_at после автосохранения.»

## 10. Медленные запросы и таймауты

**Признак:** экран долго грузится, в журнале API Gateway большое время ответа.

```sql
explain analyze select * from public.list_transactions(current_date - 30, current_date);
select relname, seq_scan, idx_scan from pg_stat_user_tables order by seq_scan desc limit 5;
```

> **Промпт:** «Вот EXPLAIN ANALYZE запроса list_transactions на 10 000 операций. Какой индекс
> добавить и почему? Покажи миграцию.»

---

## Где смотреть логи Supabase

| Журнал | Что искать |
|--------|-----------|
| Logs → **API Gateway** | HTTP-статус запроса (401, 404, 409, 500), путь, время |
| Logs → **Postgres** | текст ошибки базы: `permission denied`, `duplicate key`, `violates` |
| Logs → **Auth** | вход, регистрация, отправка писем, ошибки токенов |
| Table Editor → **client_errors** | ошибки, которые прислал сам сайт (экран, код, сообщение) |

**Реальный случай из шага 7:** в журнале Postgres нашлась строка
`permission denied for table client_errors` (42501). AI-агент по ней определил, что сайт
пытается записать ошибку от гостя (страница входа), и добавил проверку сессии в `logger.ts`.
