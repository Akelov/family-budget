# Методичка: как проверить, что база работает (без сайта)

Всё делается в панели Supabase: https://supabase.com/dashboard → проект `family-budget`.

## Часть 1. Посмотреть, что всё создано (2 минуты)

1. **Table Editor** — слева 11 таблиц (`households`, `members`, `categories`, …). У каждой отметка, что RLS включён.
2. **Database → Functions** — наши функции: `create_household`, `list_transactions`, `create_transaction`, …
3. **Authentication → Policies** — правила доступа для каждой таблицы (`categories_select`, `budgets_write`, …).

## Часть 2. Два тестовых пользователя

**Authentication → Users → Add user → Create new user**:

| Email | Пароль | Галочка |
|---|---|---|
| `test1@example.com` | любой, например `Test12345!` | **Auto Confirm User** — чтобы не ждать письма |
| `test2@example.com` | любой | **Auto Confirm User** |

## Часть 3. Проверка от имени пользователя

Откройте новую вкладку запроса (**+** рядом с вкладками) — чтобы не смешивать с файлами миграций.
Каждый блок ниже начинается с «представиться» нужным пользователем: `set_config` передаёт базе,
кто вошёл (так же делает сайт через Supabase Auth), а `set local role authenticated` включает
права обычного пользователя сайта вместо прав администратора. Действует только до конца блока.

**Блок 1 — test1 создаёт семью и операцию** (вставить целиком → Run):

```sql
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email = 'test1@example.com'), 'role', 'authenticated')::text, true);
set local role authenticated;

select * from create_household('Семья Тест');
select create_transaction(gen_random_uuid(), 'expense', 150000,
  (select id from subcategories where name = 'Топливо'), current_date, 'Проверка', array['тест']);
select (select count(*) from categories) as "категорий (15)",
       (select count(*) from transactions) as "операций (1)";
commit;
```

**Блок 2 — test1 смотрит историю и итоги** (суммы в копейках: 150000 = 1 500 ₽):

```sql
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email = 'test1@example.com'), 'role', 'authenticated')::text, true);
set local role authenticated;
select * from period_summary(current_date - 30, current_date);
commit;
```

**Блок 3 — test2 не видит чужие данные:**

```sql
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email = 'test2@example.com'), 'role', 'authenticated')::text, true);
set local role authenticated;
select (select count(*) from transactions) as "операций видно (0)",
       (select count(*) from categories) as "категорий видно (0)",
       (select count(*) from households) as "семей видно (0)";
commit;
```

**Блок 4 — посетитель без входа** (ожидаем ошибку `permission denied for table transactions`):

```sql
begin;
set local role anon;
select * from transactions;
commit;
```

## Часть 4. Взгляд администратора

Верните роль **postgres** и откройте **Table Editor → transactions**: видна операция test1.
Администратор проекта видит всё — правила RLS ограничивают пользователей сайта, а не владельца
проекта Supabase.

## Если хотите убрать тестовые данные

Под ролью `postgres`:

```sql
delete from households where name in ('Семья Тест', 'Семья Другая');
```

(удалит семьи со всеми их данными), затем удалите пользователей в **Authentication → Users**.
