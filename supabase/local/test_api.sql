-- Локальная проверка функций API (шаг 4). Запуск: psql -f после миграций.
-- Правила RLS добавятся на шаге 5, поэтому здесь работаем как владелец базы,
-- а «кто вошёл» задаём через request.jwt.claim.sub — так это делает Supabase.
\set ON_ERROR_STOP on
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alexey@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'maria@example.com');

-- 1. Алексей входит и создаёт семью
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select name as "семья создана" from public.create_household('Семья Ивановых');
select count(*) as "категорий", (select count(*) from subcategories) as "подкатегорий" from categories;
select display_name, role from members;

-- 2. Создаёт операцию (2 500,50 ₽ на топливо) с тегами; повтор того же id не дублирует
select public.create_transaction('11111111-1111-1111-1111-111111111111', 'expense', 250050,
  (select s.id from subcategories s join categories c on c.id = s.category_id where c.name = 'Автомобиль' and s.name = 'Топливо'),
  current_date, 'АЗС', array['Отпуск', 'отпуск', 'Дача']) as "создана";
select public.create_transaction('11111111-1111-1111-1111-111111111111', 'expense', 1,
  (select id from subcategories limit 1), current_date) as "повтор";
select count(*) as "операций" from transactions;
select name as "тег" from tags order by name;

-- 3. Доход и список с фильтрами
select public.create_transaction(gen_random_uuid(), 'income', 9500000,
  (select s.id from subcategories s join categories c on c.id = s.category_id where s.name = 'Основная выплата'),
  current_date, 'Зарплата') is not null as "доход создан";
select amount, comment, cardinality(tag_ids) as tags from public.list_transactions(current_date - 30, current_date);
select comment as "поиск «дача»" from public.list_transactions(current_date - 30, current_date, p_search => 'дача');
select * from public.period_summary(current_date - 30, current_date);
select c.name, r.amount from public.report_by_category(current_date - 30, current_date, 'expense') r join categories c on c.id = r.category_id;

-- 4. Изменение с проверкой конфликта
do $$
declare v timestamptz;
begin
  v := (select updated_at from transactions where id = '11111111-1111-1111-1111-111111111111');
  perform public.update_transaction('11111111-1111-1111-1111-111111111111', v, 'expense', 300000,
    (select subcategory_id from transactions where id = '11111111-1111-1111-1111-111111111111'), current_date, 'АЗС Лукойл', array['Дача']);
  raise notice 'изменение 1: ок';
  begin
    perform public.update_transaction('11111111-1111-1111-1111-111111111111', v, 'expense', 1,
      (select subcategory_id from transactions where id = '11111111-1111-1111-1111-111111111111'), current_date);
  exception when sqlstate 'P0409' then raise notice 'изменение 2 со старой версией: %', sqlerrm;
  end;
end $$;

-- 5. Удаление и восстановление
select public.delete_transaction('11111111-1111-1111-1111-111111111111');
select count(*) as "в списке после удаления" from public.list_transactions(current_date - 30, current_date);
select public.restore_transaction('11111111-1111-1111-1111-111111111111');
select count(*) as "после «Отменить»" from public.list_transactions(current_date - 30, current_date);

-- 6. Бюджет «Авто» на 20 000 ₽ — вся категория
insert into budgets (id, household_id, name, amount)
  values ('22222222-2222-2222-2222-222222222222', public.my_household_id(), 'Авто', 20000);
insert into budget_items (budget_id, category_id)
  values ('22222222-2222-2222-2222-222222222222', (select id from categories where name = 'Автомобиль'));
select * from public.budget_status(current_date - 30, current_date);

-- 7. Мария: приглашение, вход в семью; чужую операцию менять нельзя
select (public.create_invite('member')).token is not null as "приглашение создано";
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select display_name, role from public.accept_invite((select token from invites limit 1));
do $$
begin
  perform public.delete_transaction('11111111-1111-1111-1111-111111111111');
exception when sqlstate 'P0403' then raise notice 'Мария удаляет чужую операцию: %', sqlerrm;
end $$;
do $$
begin
  perform public.accept_invite((select token from invites limit 1));
exception when sqlstate 'P0404' then raise notice 'повторное использование приглашения: %', sqlerrm;
end $$;
