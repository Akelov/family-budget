-- =============================================================================
-- Проверка всех запросов к серверу (ДЗ5, шаг 8).
--
-- Как запустить: Supabase → SQL Editor → вставить файл целиком → Run.
-- Результат — таблица: запрос, случай, что ожидалось, что получилось, итог.
--
-- Скрипт НИЧЕГО не меняет в базе: тестовые пользователи, семьи и операции создаются
-- внутри блока, который в конце откатывается (raise → rollback вложенной транзакции).
-- Запросы выполняются от имени разных ролей так же, как их выполняет сайт:
--   anon          — гость без входа (публичный ключ без токена);
--   authenticated — вошедший пользователь, его id задаётся через request.jwt.claims.
--
-- Действующие лица (тестовые, только мок-данные):
--   A — владелец семьи 1, B — участник семьи 1, C — владелец чужой семьи 2,
--   N — пользователь без семьи (потом становится администратором семьи 1).
--
-- Коды результата: OK — запрос прошёл; P0401/P0403/P0404/P0409 — наши ошибки
-- (нет входа / нет прав / не найдено / конфликт версий); 23514 — неверные данные;
-- 23505 — дубликат; 23503 — есть связанные записи; 42501 — отказ PostgreSQL (права, RLS).
-- =============================================================================

-- Выполняет SQL от имени пользователя (null — гость) и возвращает OK или код ошибки.
-- SQL должен вернуть true; false/пусто — «FALSE» (запрос прошёл, но результат не тот).
-- Можно передать «действие; проверка» — две команды через точку с запятой.
create or replace function pg_temp.chk(p_user uuid, p_sql text)
returns text
language plpgsql
as $$
declare
  v_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  perform set_config('request.jwt.claims',
    case when p_user is null then '{"role":"anon"}'
         else json_build_object('sub', p_user, 'role', 'authenticated')::text end, true);
  if p_user is null then
    set local role anon;
  else
    set local role authenticated;
  end if;
  -- «действие; проверка»: сначала действие, затем отдельным запросом — проверка результата
  -- (в одном запросе изменения, сделанные функцией, ещё не видны).
  if position(';' in p_sql) > 0 then
    execute split_part(p_sql, ';', 1);
    execute split_part(p_sql, ';', 2) into v_ok;
  else
    execute p_sql into v_ok;
  end if;
  reset role;
  return case when v_ok then 'OK' else 'FALSE' end;
exception when others then
  reset role;
  return sqlstate;
end;
$$;

-- Добавляет строку результата в накопитель (jsonb-массив переживает откат данных).
create or replace function pg_temp.t(
  p_acc jsonb, p_endpoint text, p_case text, p_expected text, p_user uuid, p_sql text
)
returns jsonb
language sql
as $$
  select p_acc || jsonb_build_array(jsonb_build_array(
    p_endpoint, p_case, p_expected, pg_temp.chk(p_user, p_sql)));
$$;

create or replace function pg_temp.endpoint_checks()
returns table ("№" int, "запрос" text, "случай" text, "ожидалось" text, "получено" text, "итог" text)
language plpgsql
as $$
declare
  r   jsonb := '[]';
  ua  constant uuid := 'e0000000-0000-4000-8000-00000000000a';
  ub  constant uuid := 'e0000000-0000-4000-8000-00000000000b';
  uc  constant uuid := 'e0000000-0000-4000-8000-00000000000c';
  un  constant uuid := 'e0000000-0000-4000-8000-00000000000d';
  tx1 constant uuid := 'e1000000-0000-4000-8000-000000000001';
  tx2 constant uuid := 'e1000000-0000-4000-8000-000000000002';
  h1 uuid; h2 uuid; sub_exp uuid; sub_inc uuid; cat_exp uuid; sub_alien uuid;
  tok text; tok_admin text; tag_from uuid; tag_into uuid; bud uuid;
begin
  begin
    insert into auth.users (id, email) values
      (ua, 'test-a@example.com'), (ub, 'test-b@example.com'),
      (uc, 'test-c@example.com'), (un, 'test-n@example.com');

    -- ---------- Доступ без входа и без семьи ----------
    r := pg_temp.t(r, 'list_transactions', 'гость без входа', '42501', null,
      'select true from public.list_transactions(current_date - 30, current_date) limit 1');
    r := pg_temp.t(r, 'GET /transactions', 'гость читает таблицу напрямую', '42501', null,
      'select count(*) >= 0 from public.transactions');
    -- Чтение работает с правами пользователя (security invoker): RLS просто не отдаёт строки.
    r := pg_temp.t(r, 'list_transactions', 'вошёл, но нет семьи — пустой список (RLS)', 'OK', un,
      'select count(*) = 0 from public.list_transactions(current_date - 30, current_date)');

    -- ---------- Семья ----------
    r := pg_temp.t(r, 'create_household', 'A создаёт семью', 'OK', ua,
      $q$select (public.create_household('Тест-семья А', 'Алексей')).id is not null$q$);
    r := pg_temp.t(r, 'create_household', 'A создаёт вторую семью', 'P0403', ua,
      $q$select (public.create_household('Ещё одна')).id is not null$q$);
    r := pg_temp.t(r, 'create_household', 'пустое название', '23514', uc,
      $q$select (public.create_household('   ')).id is not null$q$);
    r := pg_temp.t(r, 'create_household', 'C создаёт свою семью', 'OK', uc,
      $q$select (public.create_household('Тест-семья C', 'Чужой')).id is not null$q$);
    r := pg_temp.t(r, 'GET /categories', 'в новой семье 15 категорий', 'OK', ua,
      'select count(*) = 15 from public.categories');

    h1 := (select household_id from public.members where user_id = ua);
    h2 := (select household_id from public.members where user_id = uc);
    select s.id, c.id into sub_exp, cat_exp from public.subcategories s
      join public.categories c on c.id = s.category_id
      where c.household_id = h1 and c.type = 'expense' order by c.name, s.name limit 1;
    sub_inc := (select s.id from public.subcategories s join public.categories c on c.id = s.category_id
      where c.household_id = h1 and c.type = 'income' limit 1);
    sub_alien := (select s.id from public.subcategories s join public.categories c on c.id = s.category_id
      where c.household_id = h2 and c.type = 'expense' limit 1);

    -- ---------- Приглашения ----------
    r := pg_temp.t(r, 'create_invite', 'владелец A приглашает участника', 'OK', ua,
      $q$select (public.create_invite('member')).token is not null$q$);
    r := pg_temp.t(r, 'create_invite', 'роль «owner» в приглашении', '23514', ua,
      $q$select (public.create_invite('owner')).token is not null$q$);
    tok := (select token from public.invites where household_id = h1 and role = 'member' limit 1);
    r := pg_temp.t(r, 'accept_invite', 'B принимает приглашение', 'OK', ub,
      format('select (public.accept_invite(%L, %L)).role = %L', tok, 'Мария', 'member'));
    r := pg_temp.t(r, 'accept_invite', 'повторное использование ссылки', 'P0404', un,
      format('select (public.accept_invite(%L)).id is not null', tok));
    r := pg_temp.t(r, 'accept_invite', 'несуществующий код', 'P0404', un,
      $q$select (public.accept_invite('нет-такого-кода')).id is not null$q$);
    r := pg_temp.t(r, 'create_invite', 'участник B (не владелец)', 'P0403', ub,
      $q$select (public.create_invite('member')).token is not null$q$);

    -- ---------- Операции: создание и проверки данных ----------
    r := pg_temp.t(r, 'create_transaction', 'A: расход 1 500,00 ₽ с тегами', 'OK', ua,
      format($q$select public.create_transaction(%L, 'expense', 150000, %L, current_date, 'Тест', array['Отпуск', 'Дача']) = %L$q$,
        tx1, sub_exp, tx1));
    r := pg_temp.t(r, 'create_transaction', 'повтор с тем же id — без дубликата', 'OK', ua,
      format($q$select public.create_transaction(%L, 'expense', 150000, %L, current_date) = %L
               and (select count(*) from public.transactions where id = %L) = 1$q$, tx1, sub_exp, tx1, tx1));
    r := pg_temp.t(r, 'create_transaction', 'сумма 0', '23514', ua,
      format($q$select public.create_transaction(gen_random_uuid(), 'expense', 0, %L, current_date) is not null$q$, sub_exp));
    r := pg_temp.t(r, 'create_transaction', 'дата в будущем', '23514', ua,
      format($q$select public.create_transaction(gen_random_uuid(), 'expense', 100, %L, current_date + 5) is not null$q$, sub_exp));
    r := pg_temp.t(r, 'create_transaction', 'доход в категорию расходов', '23514', ua,
      format($q$select public.create_transaction(gen_random_uuid(), 'income', 100, %L, current_date) is not null$q$, sub_exp));
    r := pg_temp.t(r, 'create_transaction', 'подкатегория чужой семьи', '23514', ua,
      format($q$select public.create_transaction(gen_random_uuid(), 'expense', 100, %L, current_date) is not null$q$, sub_alien));
    r := pg_temp.t(r, 'create_transaction', '11 тегов (максимум 10)', '23514', ua,
      format($q$select public.create_transaction(gen_random_uuid(), 'expense', 100, %L, current_date, '',
               array['1','2','3','4','5','6','7','8','9','10','11']) is not null$q$, sub_exp));
    r := pg_temp.t(r, 'POST /transactions', 'запись в таблицу в обход функции', '42501', ua,
      format($q$with i as (insert into public.transactions (id, household_id, type, amount, subcategory_id, date, author_id)
               values (gen_random_uuid(), %L, 'expense', 1, %L, current_date,
                       (select id from public.members where household_id = %L limit 1)) returning 1)
             select count(*) = 1 from i$q$, h1, sub_exp, h1));
    r := pg_temp.t(r, 'create_transaction', 'B: свой расход 500,00 ₽', 'OK', ub,
      format($q$select public.create_transaction(%L, 'expense', 50000, %L, current_date) = %L$q$, tx2, sub_exp, tx2));
    r := pg_temp.t(r, 'create_transaction', 'A: доход 80 000,00 ₽', 'OK', ua,
      format($q$select public.create_transaction(gen_random_uuid(), 'income', 8000000, %L, current_date) is not null$q$, sub_inc));

    -- ---------- Чтение ----------
    r := pg_temp.t(r, 'list_transactions', 'A видит 3 операции семьи', 'OK', ua,
      'select count(*) = 3 from public.list_transactions(current_date - 30, current_date)');
    r := pg_temp.t(r, 'list_transactions', 'поиск по комментарию «тест»', 'OK', ua,
      $q$select count(*) = 1 from public.list_transactions(current_date - 30, current_date, p_search => 'тест')$q$);
    r := pg_temp.t(r, 'list_transactions', 'C из чужой семьи видит 0 операций семьи 1', 'OK', uc,
      'select count(*) = 0 from public.list_transactions(current_date - 30, current_date)');
    r := pg_temp.t(r, 'GET /transactions', 'C читает таблицу напрямую — 0 строк', 'OK', uc,
      'select count(*) = 0 from public.transactions');
    r := pg_temp.t(r, 'period_summary', 'доход 80 000, расход 2 000, итог 78 000', 'OK', ua,
      'select income = 8000000 and expense = 200000 and balance = 7800000
         from public.period_summary(current_date - 30, current_date)');

    -- ---------- Изменение и удаление ----------
    r := pg_temp.t(r, 'update_transaction', 'A меняет свою операцию', 'OK', ua,
      format($q$select public.update_transaction(%L, (select updated_at from public.transactions where id = %L),
               'expense', 200000, %L, current_date, 'Тест 2', array['Отпуск', 'Дача']) is not null$q$, tx1, tx1, sub_exp));
    r := pg_temp.t(r, 'update_transaction', 'устаревшая версия (изменил другой)', 'P0409', ua,
      format($q$select public.update_transaction(%L, '2000-01-01', 'expense', 1, %L, current_date) is not null$q$, tx1, sub_exp));
    r := pg_temp.t(r, 'update_transaction', 'участник B меняет чужую операцию', 'P0403', ub,
      format($q$select public.update_transaction(%L, (select updated_at from public.transactions where id = %L),
               'expense', 1, %L, current_date) is not null$q$, tx1, tx1, sub_exp));
    r := pg_temp.t(r, 'update_transaction', 'B меняет свою операцию', 'OK', ub,
      format($q$select public.update_transaction(%L, (select updated_at from public.transactions where id = %L),
               'expense', 60000, %L, current_date) is not null$q$, tx2, tx2, sub_exp));
    r := pg_temp.t(r, 'delete_transaction', 'C удаляет операцию чужой семьи', 'P0404', uc,
      format('select true from public.delete_transaction(%L)', tx1));
    r := pg_temp.t(r, 'delete_transaction', 'A удаляет — операция пропадает из списка', 'OK', ua,
      format($q$select true from public.delete_transaction(%L);
               select count(*) = 2 from public.list_transactions(current_date - 30, current_date)$q$, tx1));
    r := pg_temp.t(r, 'restore_transaction', 'A нажимает «Отменить»', 'OK', ua,
      format($q$select true from public.restore_transaction(%L);
               select count(*) = 3 from public.list_transactions(current_date - 30, current_date)$q$, tx1));

    -- ---------- Отчёты ----------
    r := pg_temp.t(r, 'report_by_category', 'расходы по категориям', 'OK', ua,
      $q$select count(*) = 1 and sum(amount) = 260000 from public.report_by_category(current_date - 30, current_date, 'expense')$q$);
    r := pg_temp.t(r, 'report_by_subcategory', 'расходы внутри категории', 'OK', ua,
      format($q$select sum(amount) = 260000 from public.report_by_subcategory(current_date - 30, current_date, %L)$q$, cat_exp));
    r := pg_temp.t(r, 'report_by_tag', 'операция с 2 тегами учтена в каждом', 'OK', ua,
      $q$select count(*) = 2 and sum(amount) = 400000 from public.report_by_tag(current_date - 30, current_date, 'expense')$q$);
    r := pg_temp.t(r, 'report_by_category', 'гость без входа', '42501', null,
      $q$select count(*) >= 0 from public.report_by_category(current_date - 30, current_date, 'expense')$q$);

    -- ---------- Бюджеты (таблицы budgets, budget_items) ----------
    r := pg_temp.t(r, 'POST /budgets', 'владелец создаёт бюджет 5 000 ₽', 'OK', ua,
      format($q$with i as (insert into public.budgets (household_id, name, amount) values (%L, 'Тест-бюджет', 5000)
               returning 1) select count(*) = 1 from i$q$, h1));
    bud := (select id from public.budgets where household_id = h1 limit 1);
    r := pg_temp.t(r, 'POST /budgets', 'участник B (нет прав)', '42501', ub,
      format($q$with i as (insert into public.budgets (household_id, name, amount) values (%L, 'Чужой', 1)
               returning 1) select count(*) = 1 from i$q$, h1));
    r := pg_temp.t(r, 'POST /budgets', 'сумма бюджета 0', '23514', ua,
      format($q$with i as (insert into public.budgets (household_id, name, amount) values (%L, 'Ноль', 0)
               returning 1) select count(*) = 1 from i$q$, h1));
    r := pg_temp.t(r, 'POST /budget_items', 'бюджет на категорию', 'OK', ua,
      format($q$with i as (insert into public.budget_items (budget_id, category_id) values (%L, %L)
               returning 1) select count(*) = 1 from i$q$, bud, cat_exp));
    r := pg_temp.t(r, 'budget_status', 'потрачено 2 600 из 5 000 ₽', 'OK', ua,
      'select amount = 500000 and spent = 260000 from public.budget_status(current_date - 30, current_date)');
    r := pg_temp.t(r, 'GET /budgets', 'C не видит бюджеты семьи 1', 'OK', uc,
      $q$select count(*) = 0 from public.budgets where name = 'Тест-бюджет'$q$);

    -- ---------- Категории ----------
    r := pg_temp.t(r, 'POST /categories', 'владелец создаёт категорию', 'OK', ua,
      format($q$with i as (insert into public.categories (household_id, type, name, icon, color)
               values (%L, 'expense', 'Тест-категория', 'tag', 3) returning 1) select count(*) = 1 from i$q$, h1));
    r := pg_temp.t(r, 'POST /categories', 'такое название уже есть', '23505', ua,
      format($q$with i as (insert into public.categories (household_id, type, name, icon, color)
               values (%L, 'expense', 'тест-категория', 'tag', 3) returning 1) select count(*) = 1 from i$q$, h1));
    r := pg_temp.t(r, 'POST /categories', 'участник B (нет прав)', '42501', ub,
      format($q$with i as (insert into public.categories (household_id, type, name, icon, color)
               values (%L, 'expense', 'От Марии', 'tag', 3) returning 1) select count(*) = 1 from i$q$, h1));
    r := pg_temp.t(r, 'DELETE /categories', 'категория с операциями', '23503', ua,
      format($q$with d as (delete from public.categories where id = %L returning 1) select count(*) = 1 from d$q$, cat_exp));
    r := pg_temp.t(r, 'PATCH /categories', 'C переименовывает чужую — 0 строк', 'OK', uc,
      format($q$with u as (update public.categories set name = 'Взлом' where id = %L returning 1)
               select count(*) = 0 from u$q$, cat_exp));

    -- ---------- Теги ----------
    tag_from := (select id from public.tags where household_id = h1 and name = 'Отпуск');
    tag_into := (select id from public.tags where household_id = h1 and name = 'Дача');
    r := pg_temp.t(r, 'merge_tags', 'участник B (нет прав)', 'P0403', ub,
      format('select true from public.merge_tags(%L, %L)', tag_from, tag_into));
    r := pg_temp.t(r, 'merge_tags', 'тег в самого себя', '23514', ua,
      format('select true from public.merge_tags(%L, %L)', tag_into, tag_into));
    r := pg_temp.t(r, 'merge_tags', '«Отпуск» → «Дача»: остался 1 тег', 'OK', ua,
      format($q$select true from public.merge_tags(%L, %L);
               select count(*) = 1 from public.tags$q$, tag_from, tag_into));

    -- ---------- Участники ----------
    r := pg_temp.t(r, 'PATCH /members', 'B меняет своё имя', 'OK', ub,
      $q$with u as (update public.members set display_name = 'Маша' where user_id = auth.uid() returning 1)
         select count(*) = 1 from u$q$);
    r := pg_temp.t(r, 'PATCH /members', 'B назначает себя владельцем', 'P0403', ub,
      $q$with u as (update public.members set role = 'owner' where user_id = auth.uid() returning 1)
         select count(*) = 1 from u$q$);
    r := pg_temp.t(r, 'leave_household', 'владелец A пытается выйти', 'P0403', ua,
      'select true from public.leave_household()');
    r := pg_temp.t(r, 'leave_household', 'участник B выходит', 'OK', ub,
      'select true from public.leave_household()');
    r := pg_temp.t(r, 'list_transactions', 'B после выхода — не видит операции семьи', 'OK', ub,
      'select count(*) = 0 from public.list_transactions(current_date - 30, current_date)');
    r := pg_temp.t(r, 'create_transaction', 'B после выхода добавляет операцию', 'P0403', ub,
      format($q$select public.create_transaction(gen_random_uuid(), 'expense', 100, %L, current_date) is not null$q$, sub_exp));
    r := pg_temp.t(r, 'GET /transactions', 'операции B остались в семье', 'OK', ua,
      format('select count(*) = 1 from public.transactions where id = %L', tx2));

    -- ---------- Администратор и удаление семьи ----------
    r := pg_temp.t(r, 'create_invite', 'приглашение администратора', 'OK', ua,
      $q$select (public.create_invite('admin')).token is not null$q$);
    tok_admin := (select token from public.invites where household_id = h1 and role = 'admin' limit 1);
    r := pg_temp.t(r, 'accept_invite', 'N становится администратором', 'OK', un,
      format('select (public.accept_invite(%L)).role = %L', tok_admin, 'admin'));
    r := pg_temp.t(r, 'POST /categories', 'администратор создаёт категорию', 'OK', un,
      format($q$with i as (insert into public.categories (household_id, type, name, icon, color)
               values (%L, 'income', 'От админа', 'tag', 5) returning 1) select count(*) = 1 from i$q$, h1));
    r := pg_temp.t(r, 'delete_household', 'администратор (не владелец)', 'P0403', un,
      'select true from public.delete_household()');
    r := pg_temp.t(r, 'PATCH /households', 'C переименовывает чужую семью — 0 строк', 'OK', uc,
      format($q$with u as (update public.households set name = 'Взлом' where id = %L returning 1)
               select count(*) = 0 from u$q$, h1));

    -- ---------- Журнал ошибок ----------
    r := pg_temp.t(r, 'POST /client_errors', 'вошедший пишет запись', 'OK', ua,
      $q$with i as (insert into public.client_errors (level, screen, code, message)
               values ('error', 'test', 'test_entry', 'Проверка') returning 1) select count(*) = 1 from i$q$);
    r := pg_temp.t(r, 'GET /client_errors', 'пользователь не может читать журнал', 'OK', ua,
      'select count(*) = 0 from public.client_errors');
    r := pg_temp.t(r, 'POST /client_errors', 'гость без входа', '42501', null,
      $q$with i as (insert into public.client_errors (level, screen, code, message)
               values ('error', 'test', 'x', 'x') returning 1) select count(*) = 1 from i$q$);

    r := pg_temp.t(r, 'delete_household', 'владелец A удаляет семью целиком', 'OK', ua,
      $q$select true from public.delete_household();
         select count(*) = 0 from public.members where user_id = auth.uid()$q$);

    -- Откат: все тестовые данные исчезают, накопленные результаты остаются в переменной r.
    raise exception using errcode = 'P0999';
  exception when sqlstate 'P0999' then
    null;
  end;

  return query
    select n::int, e->>0, e->>1, e->>2, e->>3,
           case when e->>2 = e->>3 then '✅' else '❌' end
    from jsonb_array_elements(r) with ordinality as x(e, n);
end;
$$;

select * from pg_temp.endpoint_checks();
