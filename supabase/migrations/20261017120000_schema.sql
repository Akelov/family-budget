-- =============================================================================
-- Миграция 1. Схема базы данных «Семейного бюджета» (ДЗ5, шаг 1).
-- Источник требований: docs/hw3/technical_specification.md, §3.1 «Модель данных».
--
-- Что здесь: таблицы, связи, ограничения, индексы и триггеры целостности.
-- Чего здесь нет (следующие миграции): политики доступа RLS (шаг 5) и серверные
-- функции RPC (шаг 4). Пока политик нет, RLS уже ВКЛЮЧЁН на всех таблицах —
-- значит, через API к ним нет доступа ни у кого («закрыто по умолчанию»).
--
-- Деньги: numeric(12,2), всегда > 0, знак задаёт type. Даты операций: date.
-- =============================================================================

-- gen_random_uuid() и gen_random_bytes() — из расширения pgcrypto (в Supabase уже включено).
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Общий триггер: обновляет updated_at при каждом изменении строки.
-- updated_at нужен для проверки конфликтов: «операцию изменил другой участник» (ERR-8).
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Семьи
-- -----------------------------------------------------------------------------
create table public.households (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(btrim(name)) between 1 and 50),
  period_mode      text not null default 'month' check (period_mode in ('month', 'cycle')),
  period_start_day smallint not null default 1 check (period_start_day between 1 and 31),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.households is 'Семья — общий бюджет нескольких пользователей';

-- -----------------------------------------------------------------------------
-- Участники семьи. Строка не удаляется при исключении (removed_at), чтобы у старых
-- операций оставалось имя автора: «Мария (бывший участник)».
-- -----------------------------------------------------------------------------
create table public.members (
  id                        uuid primary key default gen_random_uuid(),
  household_id              uuid not null references public.households (id) on delete cascade,
  user_id                   uuid references auth.users (id) on delete set null,
  role                      text not null check (role in ('owner', 'admin', 'member')),
  display_name              text not null check (char_length(btrim(display_name)) between 1 and 40),
  personal_period_mode      text check (personal_period_mode in ('month', 'cycle')),
  personal_period_start_day smallint check (personal_period_start_day between 1 and 31),
  removed_at                timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
comment on table public.members is 'Участник семьи: пользователь + роль owner / admin / member';

-- Среди активных участников: пользователь не больше чем в одной семье…
create unique index members_one_household_per_user
  on public.members (user_id) where removed_at is null;
-- …и ровно один владелец на семью (не больше одного — индексом, «хотя бы один» — логикой RPC).
create unique index members_one_owner_per_household
  on public.members (household_id) where role = 'owner' and removed_at is null;
create index members_household_idx on public.members (household_id);

-- -----------------------------------------------------------------------------
-- Приглашения по ссылке: одноразовые, 7 дней.
-- -----------------------------------------------------------------------------
create table public.invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  token        text not null unique default encode(gen_random_bytes(24), 'hex'),
  role         text not null check (role in ('admin', 'member')),
  expires_at   timestamptz not null default now() + interval '7 days',
  revoked_at   timestamptz,
  used_at      timestamptz,
  used_by      uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index invites_household_idx on public.invites (household_id);

-- -----------------------------------------------------------------------------
-- Категории и подкатегории. Подкатегория обязательна у каждой операции.
-- household_id есть и в подкатегориях: так правила доступа проверяют семью без JOIN.
-- -----------------------------------------------------------------------------
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  type         text not null check (type in ('income', 'expense')),
  name         text not null check (char_length(btrim(name)) between 1 and 40),
  color        smallint not null check (color between 1 and 12),
  icon         text not null,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- Название уникально в семье и типе без учёта регистра и пробелов по краям (FR-2.7).
create unique index categories_unique_name
  on public.categories (household_id, type, lower(btrim(name)));

create table public.subcategories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  category_id  uuid not null references public.categories (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 40),
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index subcategories_unique_name
  on public.subcategories (category_id, lower(btrim(name)));
create index subcategories_category_idx on public.subcategories (category_id);

-- -----------------------------------------------------------------------------
-- Операции. id генерирует клиент (повтор сохранения не создаёт дубликат, FR-3.4).
-- Удаление мягкое (deleted_at), чтобы работала кнопка «Отменить».
-- -----------------------------------------------------------------------------
create table public.transactions (
  id             uuid primary key,
  household_id   uuid not null references public.households (id) on delete cascade,
  type           text not null check (type in ('income', 'expense')),
  amount         numeric(12, 2) not null check (amount > 0),
  subcategory_id uuid not null references public.subcategories (id) on delete restrict,
  date           date not null,
  comment        text not null default '' check (char_length(comment) <= 500),
  author_id      uuid not null references public.members (id) on delete restrict,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
-- Индексы из ТЗ: история по дате и фильтр по подкатегории.
create index transactions_household_date_idx on public.transactions (household_id, date desc);
create index transactions_subcategory_idx on public.transactions (subcategory_id);

-- -----------------------------------------------------------------------------
-- Теги и связь «операция — тег» (многие ко многим).
-- -----------------------------------------------------------------------------
create table public.tags (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 30),
  created_at   timestamptz not null default now()
);
create unique index tags_unique_name on public.tags (household_id, lower(btrim(name)));

create table public.transaction_tags (
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  tag_id         uuid not null references public.tags (id) on delete cascade,
  primary key (transaction_id, tag_id)
);
create index transaction_tags_tag_idx on public.transaction_tags (tag_id);

-- -----------------------------------------------------------------------------
-- Бюджеты: лимит на период и набор категорий / подкатегорий.
-- Элемент — ЛИБО категория целиком (включая будущие подкатегории), ЛИБО одна подкатегория.
-- -----------------------------------------------------------------------------
create table public.budgets (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 40),
  amount       numeric(12, 2) not null check (amount > 0),
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.budget_items (
  id             uuid primary key default gen_random_uuid(),
  budget_id      uuid not null references public.budgets (id) on delete cascade,
  category_id    uuid references public.categories (id) on delete restrict,
  subcategory_id uuid references public.subcategories (id) on delete restrict,
  -- Ровно одно из двух полей заполнено.
  check (num_nonnulls(category_id, subcategory_id) = 1)
);
create index budget_items_budget_idx on public.budget_items (budget_id);

-- -----------------------------------------------------------------------------
-- Журнал ошибок интерфейса (ТЗ §6.4). Клиент может только добавлять строки.
-- -----------------------------------------------------------------------------
create table public.client_errors (
  id           bigint generated always as identity primary key,
  household_id uuid references public.households (id) on delete cascade,
  level        text not null check (level in ('error', 'warning')),
  screen       text not null check (char_length(screen) <= 50),
  code         text not null check (char_length(code) <= 50),
  message      text not null check (char_length(message) <= 500),
  created_at   timestamptz not null default now()
);

-- =============================================================================
-- Триггеры updated_at
-- =============================================================================
create trigger households_updated_at before update on public.households
  for each row execute function public.set_updated_at();
create trigger members_updated_at before update on public.members
  for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger subcategories_updated_at before update on public.subcategories
  for each row execute function public.set_updated_at();
create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
create trigger budgets_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Триггеры целостности: правила, которые нельзя выразить простым CHECK
-- =============================================================================

-- Подкатегория принадлежит той же семье, что и её категория.
create or replace function public.check_subcategory()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.categories c
    where c.id = new.category_id and c.household_id = new.household_id
  ) then
    raise exception 'Категория не принадлежит этой семье' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger subcategories_check before insert or update on public.subcategories
  for each row execute function public.check_subcategory();

-- Операция: тип = тип категории подкатегории, подкатегория и автор — из той же семьи,
-- дата не позже «сегодня + 1 день» (запас на часовые пояса). CHECK с current_date
-- не используем: CHECK должен давать один и тот же ответ всегда, а «сегодня» меняется.
create or replace function public.check_transaction()
returns trigger
language plpgsql
as $$
declare
  v_type text;
begin
  select c.type into v_type
  from public.subcategories s
  join public.categories c on c.id = s.category_id
  where s.id = new.subcategory_id and s.household_id = new.household_id;

  if v_type is null then
    raise exception 'Подкатегория не принадлежит этой семье' using errcode = '23514';
  end if;
  if v_type <> new.type then
    raise exception 'Тип операции не совпадает с типом категории' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.members m
    where m.id = new.author_id and m.household_id = new.household_id
  ) then
    raise exception 'Автор не состоит в этой семье' using errcode = '23514';
  end if;
  if new.date > current_date + 1 then
    raise exception 'Дата не может быть в будущем' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger transactions_check before insert or update on public.transactions
  for each row execute function public.check_transaction();

-- Не более 10 тегов на операцию; тег и операция — из одной семьи.
create or replace function public.check_transaction_tag()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.transactions t
    join public.tags g on g.household_id = t.household_id
    where t.id = new.transaction_id and g.id = new.tag_id
  ) then
    raise exception 'Тег не принадлежит семье операции' using errcode = '23514';
  end if;
  if (select count(*) from public.transaction_tags where transaction_id = new.transaction_id) >= 10 then
    raise exception 'Не более 10 тегов на операцию' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger transaction_tags_check before insert on public.transaction_tags
  for each row execute function public.check_transaction_tag();

-- Элемент бюджета — только расходная категория / подкатегория той же семьи.
create or replace function public.check_budget_item()
returns trigger
language plpgsql
as $$
declare
  v_household uuid;
  v_type      text;
begin
  select household_id into v_household from public.budgets where id = new.budget_id;

  if new.category_id is not null then
    select c.type into v_type from public.categories c
    where c.id = new.category_id and c.household_id = v_household;
  else
    select c.type into v_type from public.subcategories s
    join public.categories c on c.id = s.category_id
    where s.id = new.subcategory_id and s.household_id = v_household;
  end if;

  if v_type is null then
    raise exception 'Категория не принадлежит семье бюджета' using errcode = '23514';
  end if;
  if v_type <> 'expense' then
    raise exception 'В бюджет входят только расходные категории' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger budget_items_check before insert or update on public.budget_items
  for each row execute function public.check_budget_item();

-- =============================================================================
-- Row Level Security: включаем на всех таблицах сразу. Без политик (шаг 5) доступ
-- через API закрыт полностью — безопасное состояние по умолчанию.
-- =============================================================================
alter table public.households       enable row level security;
alter table public.members          enable row level security;
alter table public.invites          enable row level security;
alter table public.categories       enable row level security;
alter table public.subcategories    enable row level security;
alter table public.transactions     enable row level security;
alter table public.tags             enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.budgets          enable row level security;
alter table public.budget_items     enable row level security;
alter table public.client_errors    enable row level security;
