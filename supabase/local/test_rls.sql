-- Локальная проверка правил RLS (шаг 5): две семьи, разные роли.
-- Запросы выполняются от роли authenticated — как запросы сайта через API Supabase.
\set ON_ERROR_STOP on
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alexey@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'maria@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'stranger@example.com');

set role authenticated;

-- Алексей создаёт семью и операцию, приглашает Марию участником
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select name from public.create_household('Семья Ивановых');
select public.create_transaction('11111111-1111-1111-1111-111111111111', 'expense', 250000,
  (select id from subcategories where name = 'Топливо'), current_date, 'АЗС') is not null as "операция";
select (public.create_invite('member')).token as token \gset

-- Чужой человек создаёт свою семью
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
select name from public.create_household('Семья Петровых');
select count(*) as "чужой видит операций (ожидаем 0)" from transactions;
select count(*) as "чужой видит семей (только свою)" from households;
select count(*) as "чужой видит категорий (15)" from categories;
update categories set name = 'Взлом' where household_id <> public.my_household_id();
select count(*) as "переименовано чужих (0)" from categories where name = 'Взлом';
do $$ begin
  perform public.delete_transaction('11111111-1111-1111-1111-111111111111');
exception when sqlstate 'P0404' then raise notice 'чужой удаляет операцию Ивановых: %', sqlerrm;
end $$;

-- Мария входит по приглашению участником (member)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select role from public.accept_invite(:'token');
select count(*) as "Мария видит операций семьи" from transactions;
update categories set name = 'Еда' where name = 'Продукты';
select count(*) as "участник переименовал (0)" from categories where name = 'Еда';
update members set display_name = 'Маша' where user_id = auth.uid();
select display_name as "своё имя участник менять может" from members where user_id = auth.uid();
do $$ begin
  update members set role = 'admin' where user_id = auth.uid();
exception when sqlstate 'P0403' then raise notice 'Мария повышает себе роль: %', sqlerrm;
end $$;
select count(*) as "участник видит приглашений (0)" from invites;
insert into client_errors (household_id, level, screen, code, message)
  values (public.my_household_id(), 'error', 'operations', 'load_failed', 'test');
select count(*) as "журнал ошибок читать нельзя (0)" from client_errors;

-- Алексей (владелец) делает Марию администратором; она теперь может менять категории
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
update members set role = 'admin' where display_name = 'Маша';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
update categories set name = 'Еда' where name = 'Продукты';
select count(*) as "администратор переименовал (1)" from categories where name = 'Еда';

-- Без входа (anon) таблицы недоступны вовсе
reset role;
set role anon;
do $$ begin
  perform count(*) from public.transactions;
exception when insufficient_privilege then raise notice 'анонимный посетитель: %', sqlerrm;
end $$;
