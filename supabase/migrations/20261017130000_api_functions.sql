-- =============================================================================
-- Миграция 2. Серверные функции (RPC) — API «Семейного бюджета» (ДЗ5, шаг 4).
-- Источник: ТЗ §3.3. Простые операции (прочитать категории, изменить бюджет …) делает
-- автоматический REST API Supabase по таблицам; здесь — действия, которые:
--   • меняют несколько таблиц сразу (создать семью с готовыми категориями);
--   • считают итоги на сервере по ВСЕМ операциям периода (сводка, отчёты, бюджеты);
--   • должны отличать «нет прав» от «конфликта» (изменение операции).
--
-- Вызов из браузера: POST /rest/v1/rpc/<имя_функции> с телом JSON из параметров.
-- Суммы в ответах — в копейках (bigint), как в интерфейсе (правило 7 CLAUDE.md).
--
-- Коды ошибок (SQLSTATE), по которым интерфейс выбирает сообщение:
--   P0401 — не выполнен вход, P0403 — нет прав, P0404 — не найдено,
--   P0409 — конфликт (изменено другим участником), 23514 — неверные данные.
--
-- SECURITY DEFINER у функций записи: они выполняются с правами владельца базы, поэтому
-- КАЖДАЯ такая функция сама проверяет, кто вызывает и что ему можно. Функции чтения —
-- SECURITY INVOKER: для них действуют правила доступа RLS (шаг 5).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Вспомогательные функции: кто я в семье. Используются в RPC и в правилах RLS (шаг 5).
-- SECURITY DEFINER нужен, чтобы правило RLS для members могло прочитать members
-- без бесконечной рекурсии.
-- -----------------------------------------------------------------------------
create or replace function public.my_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.members
  where user_id = auth.uid() and removed_at is null
$$;

create or replace function public.my_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.members
  where user_id = auth.uid() and removed_at is null
$$;

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.members
  where user_id = auth.uid() and removed_at is null
$$;

-- Проверка «вошёл и состоит в семье»; возвращает id семьи.
create or replace function public.require_household()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_household uuid;
begin
  if auth.uid() is null then
    raise exception 'Нужно войти в аккаунт' using errcode = 'P0401';
  end if;
  v_household := public.my_household_id();
  if v_household is null then
    raise exception 'Вы не состоите в семье' using errcode = 'P0403';
  end if;
  return v_household;
end;
$$;

-- =============================================================================
-- Семья и приглашения
-- =============================================================================

-- create_household: семья + владелец + готовый набор категорий (приложение A ТЗ) — одной транзакцией.
create or replace function public.create_household(p_name text, p_display_name text default null)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household public.households;
  v_email     text;
  v_cat       uuid;
  r           record;
  s           text;
begin
  if auth.uid() is null then
    raise exception 'Нужно войти в аккаунт' using errcode = 'P0401';
  end if;
  if public.my_household_id() is not null then
    raise exception 'Вы уже состоите в семье' using errcode = 'P0403';
  end if;

  insert into public.households (name) values (btrim(p_name)) returning * into v_household;

  -- Имя по умолчанию — часть email до «@» (FR-1.3).
  select split_part(email, '@', 1) into v_email from auth.users where id = auth.uid();
  insert into public.members (household_id, user_id, role, display_name)
  values (v_household.id, auth.uid(), 'owner', coalesce(nullif(btrim(p_display_name), ''), v_email, 'Владелец'));

  for r in
    select * from (values
      ('expense', 'Продукты', 'shopping-cart', 1, array['Супермаркет', 'Рынок', 'Доставка']),
      ('expense', 'Кафе', 'coffee', 2, array['Кофе', 'Обеды', 'Рестораны']),
      ('expense', 'Дом', 'house', 3, array['Коммунальные услуги', 'Аренда', 'Ремонт', 'Товары для дома']),
      ('expense', 'Автомобиль', 'car', 4, array['Топливо', 'Обслуживание', 'Запчасти', 'Штрафы', 'Платные дороги', 'Парковка']),
      ('expense', 'Транспорт', 'bus', 5, array['Общественный', 'Такси']),
      ('expense', 'Здоровье', 'heart-pulse', 6, array['Аптека', 'Врачи']),
      ('expense', 'Дети', 'baby', 7, array['Кружки', 'Одежда', 'Игрушки', 'Карманные деньги']),
      ('expense', 'Одежда', 'shirt', 8, array['Взрослая', 'Обувь']),
      ('expense', 'Связь', 'smartphone', 9, array['Мобильная связь', 'Интернет', 'Подписки']),
      ('expense', 'Развлечения', 'ticket', 10, array['Кино и события', 'Путешествия', 'Хобби']),
      ('expense', 'Подарки', 'gift', 11, array['Подарки']),
      ('expense', 'Прочее', 'circle-ellipsis', 12, array['Прочее']),
      ('income', 'Зарплата', 'briefcase', 1, array['Аванс', 'Основная выплата', 'Премия']),
      ('income', 'Подработка', 'hammer', 2, array['Подработка']),
      ('income', 'Прочие доходы', 'wallet', 3, array['Кэшбэк', 'Подарки', 'Возвраты', 'Прочее'])
    ) as t(type, name, icon, color, subs)
  loop
    insert into public.categories (household_id, type, name, icon, color)
    values (v_household.id, r.type, r.name, r.icon, r.color)
    returning id into v_cat;
    foreach s in array r.subs loop
      insert into public.subcategories (household_id, category_id, name) values (v_household.id, v_cat, s);
    end loop;
  end loop;

  return v_household;
end;
$$;

-- create_invite: ссылка-приглашение (только владелец, FR-1.4).
create or replace function public.create_invite(p_role text)
returns public.invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid := public.require_household();
  v_invite    public.invites;
begin
  if public.my_role() <> 'owner' then
    raise exception 'Недостаточно прав для этого действия' using errcode = 'P0403';
  end if;
  insert into public.invites (household_id, role) values (v_household, p_role) returning * into v_invite;
  return v_invite;
end;
$$;

-- accept_invite: проверяет срок, отзыв, использование и лимит 10 участников (FR-1.5).
create or replace function public.accept_invite(p_token text, p_display_name text default null)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites;
  v_member public.members;
  v_email  text;
begin
  if auth.uid() is null then
    raise exception 'Нужно войти в аккаунт' using errcode = 'P0401';
  end if;
  select * into v_invite from public.invites where token = p_token for update;
  if v_invite.id is null or v_invite.revoked_at is not null or v_invite.used_at is not null
     or v_invite.expires_at < now() then
    raise exception 'Приглашение недействительно. Попросите новую ссылку' using errcode = 'P0404';
  end if;
  if public.my_household_id() is not null then
    raise exception 'Вы уже состоите в семье. Чтобы принять приглашение, выйдите из неё в настройках профиля'
      using errcode = 'P0403';
  end if;
  if (select count(*) from public.members where household_id = v_invite.household_id and removed_at is null) >= 10 then
    raise exception 'В семье уже максимум участников' using errcode = 'P0403';
  end if;

  select split_part(email, '@', 1) into v_email from auth.users where id = auth.uid();
  insert into public.members (household_id, user_id, role, display_name)
  values (v_invite.household_id, auth.uid(), v_invite.role,
          coalesce(nullif(btrim(p_display_name), ''), v_email, 'Участник'))
  returning * into v_member;
  update public.invites set used_at = now(), used_by = auth.uid() where id = v_invite.id;
  return v_member;
end;
$$;

-- =============================================================================
-- Операции: список, сводка, создание, изменение, удаление
-- =============================================================================

-- Общий фильтр истории (FR-3.11, FR-3.12): разные фильтры — по «И», значения внутри — по «ИЛИ»;
-- категории и подкатегории — один фильтр. Пустой массив или null — фильтр не задан.
create or replace function public.transaction_matches(
  t public.transactions,
  p_search text,
  p_type text,
  p_category_ids uuid[],
  p_subcategory_ids uuid[],
  p_tag_ids uuid[],
  p_author_ids uuid[]
)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    (p_type is null or t.type = p_type)
    and (
      coalesce(cardinality(p_category_ids), 0) + coalesce(cardinality(p_subcategory_ids), 0) = 0
      or t.subcategory_id = any (coalesce(p_subcategory_ids, '{}'))
      or exists (
        select 1 from public.subcategories s
        where s.id = t.subcategory_id and s.category_id = any (coalesce(p_category_ids, '{}'))
      )
    )
    and (
      coalesce(cardinality(p_tag_ids), 0) = 0
      or exists (select 1 from public.transaction_tags tt where tt.transaction_id = t.id and tt.tag_id = any (p_tag_ids))
    )
    and (coalesce(cardinality(p_author_ids), 0) = 0 or t.author_id = any (p_author_ids))
    and (
      coalesce(btrim(p_search), '') = ''
      or t.comment ilike '%' || btrim(p_search) || '%'
      or exists (
        select 1 from public.subcategories s join public.categories c on c.id = s.category_id
        where s.id = t.subcategory_id
          and (s.name ilike '%' || btrim(p_search) || '%' or c.name ilike '%' || btrim(p_search) || '%')
      )
      or exists (
        select 1 from public.transaction_tags tt join public.tags g on g.id = tt.tag_id
        where tt.transaction_id = t.id and g.name ilike '%' || btrim(p_search) || '%'
      )
    )
$$;

-- list_transactions: порция истории (по 50), новые сверху (FR-3.8). Суммы — в копейках.
create or replace function public.list_transactions(
  p_from date,
  p_to date,
  p_search text default null,
  p_type text default null,
  p_category_ids uuid[] default null,
  p_subcategory_ids uuid[] default null,
  p_tag_ids uuid[] default null,
  p_author_ids uuid[] default null,
  p_offset integer default 0,
  p_limit integer default 50
)
returns table (
  id uuid, type text, amount bigint, subcategory_id uuid, date date, comment text,
  tag_ids uuid[], author_id uuid, created_at timestamptz, updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select t.id, t.type, (t.amount * 100)::bigint, t.subcategory_id, t.date, t.comment,
         coalesce(array(select tt.tag_id from public.transaction_tags tt where tt.transaction_id = t.id), '{}'),
         t.author_id, t.created_at, t.updated_at
  from public.transactions t
  where t.deleted_at is null
    and t.date between p_from and p_to
    and public.transaction_matches(t, p_search, p_type, p_category_ids, p_subcategory_ids, p_tag_ids, p_author_ids)
  order by t.date desc, t.created_at desc, t.id desc
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 200)
$$;

-- period_summary: доход, расход, остаток по ВСЕМ операциям периода с фильтрами (FR-3.10).
create or replace function public.period_summary(
  p_from date,
  p_to date,
  p_search text default null,
  p_type text default null,
  p_category_ids uuid[] default null,
  p_subcategory_ids uuid[] default null,
  p_tag_ids uuid[] default null,
  p_author_ids uuid[] default null
)
returns table (income bigint, expense bigint, balance bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select x.income, x.expense, x.income - x.expense
  from (
    select
      (coalesce(sum(t.amount) filter (where t.type = 'income'), 0) * 100)::bigint as income,
      (coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) * 100)::bigint as expense
    from public.transactions t
    where t.deleted_at is null
      and t.date between p_from and p_to
      and public.transaction_matches(t, p_search, p_type, p_category_ids, p_subcategory_ids, p_tag_ids, p_author_ids)
  ) x
$$;

-- Привязка тегов по названиям: существующие ищутся без учёта регистра, новые создаются (FR-6.1).
create or replace function public.set_transaction_tags(p_transaction_id uuid, p_household uuid, p_tags text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_tag  uuid;
begin
  if coalesce(cardinality(p_tags), 0) > 10 then
    raise exception 'Не более 10 тегов на операцию' using errcode = '23514';
  end if;
  delete from public.transaction_tags where transaction_id = p_transaction_id;
  foreach v_name in array coalesce(p_tags, '{}') loop
    continue when btrim(v_name) = '';
    select id into v_tag from public.tags
    where household_id = p_household and lower(btrim(name)) = lower(btrim(v_name));
    if v_tag is null then
      insert into public.tags (household_id, name) values (p_household, btrim(v_name)) returning id into v_tag;
    end if;
    insert into public.transaction_tags (transaction_id, tag_id) values (p_transaction_id, v_tag)
    on conflict do nothing;
  end loop;
end;
$$;

-- create_transaction: id генерирует клиент; повтор с тем же id возвращает уже созданную
-- операцию, а не дубликат (FR-3.4). Автор — текущий участник, его задаёт сервер.
create or replace function public.create_transaction(
  p_id uuid,
  p_type text,
  p_amount bigint,
  p_subcategory_id uuid,
  p_date date,
  p_comment text default '',
  p_tags text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid := public.require_household();
begin
  if exists (select 1 from public.transactions where id = p_id) then
    if not exists (select 1 from public.transactions where id = p_id and household_id = v_household) then
      raise exception 'Недостаточно прав для этого действия' using errcode = 'P0403';
    end if;
    return p_id;
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 999999999999 then
    raise exception 'Введите сумму больше 0 с точностью до копеек' using errcode = '23514';
  end if;
  insert into public.transactions (id, household_id, type, amount, subcategory_id, date, comment, author_id)
  values (p_id, v_household, p_type, p_amount / 100.0, p_subcategory_id, p_date,
          btrim(coalesce(p_comment, '')), public.my_member_id());
  perform public.set_transaction_tags(p_id, v_household, p_tags);
  return p_id;
end;
$$;

-- Найти операцию своей семьи и проверить право менять её (свою — любой, чужую — owner/admin).
create or replace function public.editable_transaction(p_id uuid)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid := public.require_household();
  v_tx        public.transactions;
begin
  select * into v_tx from public.transactions where id = p_id and household_id = v_household;
  if v_tx.id is null then
    raise exception 'Операция удалена' using errcode = 'P0404';
  end if;
  if v_tx.author_id <> public.my_member_id() and public.my_role() not in ('owner', 'admin') then
    raise exception 'Недостаточно прав для этого действия' using errcode = 'P0403';
  end if;
  return v_tx;
end;
$$;

-- update_transaction: изменение с проверкой updated_at (FR-3.5). Автор не меняется.
create or replace function public.update_transaction(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_type text,
  p_amount bigint,
  p_subcategory_id uuid,
  p_date date,
  p_comment text default '',
  p_tags text[] default '{}'
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx      public.transactions := public.editable_transaction(p_id);
  v_updated timestamptz;
begin
  if v_tx.deleted_at is not null then
    raise exception 'Операция удалена' using errcode = 'P0404';
  end if;
  if v_tx.updated_at <> p_expected_updated_at then
    raise exception 'Операция была изменена другим участником' using errcode = 'P0409';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 999999999999 then
    raise exception 'Введите сумму больше 0 с точностью до копеек' using errcode = '23514';
  end if;
  update public.transactions
  set type = p_type, amount = p_amount / 100.0, subcategory_id = p_subcategory_id,
      date = p_date, comment = btrim(coalesce(p_comment, ''))
  where id = p_id
  returning updated_at into v_updated;
  perform public.set_transaction_tags(p_id, v_tx.household_id, p_tags);
  return v_updated;
end;
$$;

-- delete_transaction / restore_transaction: мягкое удаление и «Отменить» (FR-3.6).
create or replace function public.delete_transaction(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.editable_transaction(p_id);
  update public.transactions set deleted_at = now() where id = p_id and deleted_at is null;
end;
$$;

create or replace function public.restore_transaction(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.editable_transaction(p_id);
  update public.transactions set deleted_at = null where id = p_id;
end;
$$;

-- =============================================================================
-- Отчёты и бюджеты: суммы по всем операциям периода, в копейках.
-- Доли (проценты) считает интерфейс методом наибольшего остатка (FR-4.5).
-- =============================================================================
create or replace function public.report_by_category(p_from date, p_to date, p_type text)
returns table (category_id uuid, amount bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select s.category_id, (sum(t.amount) * 100)::bigint
  from public.transactions t
  join public.subcategories s on s.id = t.subcategory_id
  where t.deleted_at is null and t.type = p_type and t.date between p_from and p_to
  group by s.category_id
  order by 2 desc
$$;

create or replace function public.report_by_subcategory(p_from date, p_to date, p_category_id uuid)
returns table (subcategory_id uuid, amount bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select t.subcategory_id, (sum(t.amount) * 100)::bigint
  from public.transactions t
  join public.subcategories s on s.id = t.subcategory_id
  where t.deleted_at is null and s.category_id = p_category_id and t.date between p_from and p_to
  group by t.subcategory_id
  order by 2 desc
$$;

-- Операция с несколькими тегами учитывается в каждом (FR-4.6).
create or replace function public.report_by_tag(p_from date, p_to date, p_type text)
returns table (tag_id uuid, amount bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select tt.tag_id, (sum(t.amount) * 100)::bigint
  from public.transactions t
  join public.transaction_tags tt on tt.transaction_id = t.id
  where t.deleted_at is null and t.type = p_type and t.date between p_from and p_to
  group by tt.tag_id
  order by 2 desc
$$;

-- budget_status: сколько потрачено по каждому активному бюджету за период семьи (FR-7.3).
-- Категория целиком включает все её подкатегории, в том числе архивные и добавленные позже.
-- Остаток, процент и статус («Почти у лимита» и т. д.) считает интерфейс в model/budget.ts.
create or replace function public.budget_status(p_from date, p_to date)
returns table (budget_id uuid, amount bigint, spent bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select b.id, (b.amount * 100)::bigint,
    coalesce((
      select (sum(t.amount) * 100)::bigint
      from public.transactions t
      where t.household_id = b.household_id
        and t.deleted_at is null and t.type = 'expense' and t.date between p_from and p_to
        and t.subcategory_id in (
          select bi.subcategory_id from public.budget_items bi
          where bi.budget_id = b.id and bi.subcategory_id is not null
          union
          select s.id from public.budget_items bi join public.subcategories s on s.category_id = bi.category_id
          where bi.budget_id = b.id and bi.category_id is not null
        )
    ), 0)
  from public.budgets b
  where b.archived_at is null
  order by b.created_at
$$;

-- =============================================================================
-- Права на вызов: только вошедшим пользователям (роль authenticated).
-- Служебные функции (проверки и привязка тегов) снаружи не вызываются.
-- =============================================================================
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.my_member_id(), public.my_household_id(), public.my_role(),
  public.create_household(text, text), public.create_invite(text), public.accept_invite(text, text),
  public.list_transactions(date, date, text, text, uuid[], uuid[], uuid[], uuid[], integer, integer),
  public.period_summary(date, date, text, text, uuid[], uuid[], uuid[], uuid[]),
  public.create_transaction(uuid, text, bigint, uuid, date, text, text[]),
  public.update_transaction(uuid, timestamptz, text, bigint, uuid, date, text, text[]),
  public.delete_transaction(uuid), public.restore_transaction(uuid),
  public.report_by_category(date, date, text), public.report_by_subcategory(date, date, uuid),
  public.report_by_tag(date, date, text), public.budget_status(date, date),
  public.transaction_matches(public.transactions, text, text, uuid[], uuid[], uuid[], uuid[])
to authenticated;
