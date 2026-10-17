-- =============================================================================
-- Миграция 3. Правила доступа Row Level Security (ДЗ5, шаг 5).
-- Источник: ТЗ §3.2 «Матрица прав» и NFR-G1 «доступ к чужой семье невозможен на уровне БД».
--
-- Как это работает: к КАЖДОМУ запросу к таблице база добавляет условие из правила.
-- Например, правило «видеть категории только своей семьи» превращает
--   select * from categories
-- в
--   select * from categories where household_id = my_household_id()
-- — даже если запрос пришёл в обход сайта. Правила проверяет база, а не браузер.
--
-- Операции (transactions) меняются только через функции API (шаг 4), которые сами
-- проверяют права, поэтому для них здесь есть только правило чтения.
-- =============================================================================

-- Анонимным посетителям (без входа) таблицы не нужны совсем — убираем права целиком.
revoke all on all tables in schema public from anon;

-- Удобные проверки роли для правил.
create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.my_role() in ('owner', 'admin'), false)
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.my_role() = 'owner', false)
$$;

grant execute on function public.is_manager(), public.is_owner() to authenticated;

-- -----------------------------------------------------------------------------
-- Семья: видят участники; название и период меняют owner и admin; удаляет только owner.
-- -----------------------------------------------------------------------------
create policy households_select on public.households
  for select to authenticated using (id = public.my_household_id());
create policy households_update on public.households
  for update to authenticated
  using (id = public.my_household_id() and public.is_manager())
  with check (id = public.my_household_id());
create policy households_delete on public.households
  for delete to authenticated using (id = public.my_household_id() and public.is_owner());

-- -----------------------------------------------------------------------------
-- Участники: список видят все участники семьи (включая бывших — для имён авторов).
-- Свою строку меняет каждый (имя, личный вид периода); чужие — только owner.
-- Что именно можно менять, дополнительно проверяет триггер ниже.
-- -----------------------------------------------------------------------------
create policy members_select on public.members
  for select to authenticated using (household_id = public.my_household_id());
create policy members_update on public.members
  for update to authenticated
  using (household_id = public.my_household_id() and (user_id = auth.uid() or public.is_owner()))
  with check (household_id = public.my_household_id());

-- Триггер-страж: участник не может сам повысить себе роль или «вернуть» себя после исключения;
-- владелец не может передать или снять роль owner (FR-1.6).
create or replace function public.guard_member_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Без вошедшего пользователя (служебные действия администратора базы) не ограничиваем.
  if auth.uid() is null then
    return new;
  end if;
  if new.household_id <> old.household_id or new.user_id is distinct from old.user_id then
    raise exception 'Недостаточно прав для этого действия' using errcode = 'P0403';
  end if;
  if new.role <> old.role or new.removed_at is distinct from old.removed_at then
    if not public.is_owner() or old.role = 'owner' or new.role = 'owner' then
      raise exception 'Недостаточно прав для этого действия' using errcode = 'P0403';
    end if;
  end if;
  return new;
end;
$$;
create trigger members_guard before update on public.members
  for each row execute function public.guard_member_update();

-- -----------------------------------------------------------------------------
-- Приглашения: видит и отзывает только владелец (создание — функцией create_invite).
-- -----------------------------------------------------------------------------
create policy invites_select on public.invites
  for select to authenticated using (household_id = public.my_household_id() and public.is_owner());
create policy invites_update on public.invites
  for update to authenticated
  using (household_id = public.my_household_id() and public.is_owner())
  with check (household_id = public.my_household_id());

-- -----------------------------------------------------------------------------
-- Категории и подкатегории: смотрят все участники, меняют owner и admin (FR-2.3).
-- -----------------------------------------------------------------------------
create policy categories_select on public.categories
  for select to authenticated using (household_id = public.my_household_id());
create policy categories_write on public.categories
  for all to authenticated
  using (household_id = public.my_household_id() and public.is_manager())
  with check (household_id = public.my_household_id() and public.is_manager());

create policy subcategories_select on public.subcategories
  for select to authenticated using (household_id = public.my_household_id());
create policy subcategories_write on public.subcategories
  for all to authenticated
  using (household_id = public.my_household_id() and public.is_manager())
  with check (household_id = public.my_household_id() and public.is_manager());

-- -----------------------------------------------------------------------------
-- Операции и их теги: только чтение своей семьи; изменения — через функции API.
-- -----------------------------------------------------------------------------
create policy transactions_select on public.transactions
  for select to authenticated using (household_id = public.my_household_id());

create policy transaction_tags_select on public.transaction_tags
  for select to authenticated
  using (exists (
    select 1 from public.transactions t
    where t.id = transaction_id and t.household_id = public.my_household_id()
  ));

-- -----------------------------------------------------------------------------
-- Теги: смотрят все; создаются из формы операции (функцией); переименовать, объединить
-- и удалить — owner и admin (FR-6.3).
-- -----------------------------------------------------------------------------
create policy tags_select on public.tags
  for select to authenticated using (household_id = public.my_household_id());
create policy tags_update on public.tags
  for update to authenticated
  using (household_id = public.my_household_id() and public.is_manager())
  with check (household_id = public.my_household_id());
create policy tags_delete on public.tags
  for delete to authenticated using (household_id = public.my_household_id() and public.is_manager());

-- -----------------------------------------------------------------------------
-- Бюджеты: смотрят все; создают и меняют owner и admin (FR-7.2).
-- -----------------------------------------------------------------------------
create policy budgets_select on public.budgets
  for select to authenticated using (household_id = public.my_household_id());
create policy budgets_write on public.budgets
  for all to authenticated
  using (household_id = public.my_household_id() and public.is_manager())
  with check (household_id = public.my_household_id() and public.is_manager());

create policy budget_items_select on public.budget_items
  for select to authenticated
  using (exists (select 1 from public.budgets b where b.id = budget_id and b.household_id = public.my_household_id()));
create policy budget_items_write on public.budget_items
  for all to authenticated
  using (public.is_manager() and exists (
    select 1 from public.budgets b where b.id = budget_id and b.household_id = public.my_household_id()))
  with check (public.is_manager() and exists (
    select 1 from public.budgets b where b.id = budget_id and b.household_id = public.my_household_id()));

-- -----------------------------------------------------------------------------
-- Журнал ошибок интерфейса: можно только добавлять, читать — нельзя (ТЗ §6.4).
-- -----------------------------------------------------------------------------
create policy client_errors_insert on public.client_errors
  for insert to authenticated
  with check (household_id is null or household_id = public.my_household_id());
