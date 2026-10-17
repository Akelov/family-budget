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

В **SQL Editor** над окном запроса (рядом с кнопкой Run) есть переключатель роли — по умолчанию
`postgres` (администратор, видит всё). Выберите роль **authenticated** и пользователя
**test1@example.com**. Теперь запросы выполняются так, как будто их отправил сайт от имени test1.

Вставьте и выполните (Run) по очереди:

```sql
-- 1) создать семью: появится семья, вы — владелец, 15 категорий
select * from create_household('Семья Тест');

-- 2) сколько категорий видит test1 (ожидаем 15)
select count(*) from categories;

-- 3) добавить операцию: 1 500 ₽ на топливо, с тегом
select create_transaction(gen_random_uuid(), 'expense', 150000,
  (select id from subcategories where name = 'Топливо'), current_date, 'Проверка', array['тест']);

-- 4) история и итоги (суммы в копейках: 150000 = 1 500 ₽)
select * from list_transactions(current_date - 30, current_date);
select * from period_summary(current_date - 30, current_date);
```

Теперь переключите пользователя на **test2@example.com** и выполните:

```sql
-- 5) чужие данные: ожидаем 0 — test2 не видит операцию test1
select count(*) from transactions;

-- 6) у test2 своя семья и свои 15 категорий
select * from create_household('Семья Другая');
select count(*) from categories;
```

Переключите роль на **anon** (посетитель без входа):

```sql
-- 7) ожидаем ошибку permission denied — без входа доступа нет
select * from transactions;
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
