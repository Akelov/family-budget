-- =============================================================================
-- Миграция 4. Дополнения для подключения сайта (ДЗ5, шаг 6).
--   • merge_tags      — объединение тегов A → B (FR-6.3): несколько таблиц сразу;
--   • leave_household — выход из семьи для admin и member (FR-1.8);
--   • Realtime        — изменения операций приходят другим участникам сразу (FR-3.13).
-- =============================================================================

-- Объединение тегов: операции с тегом A получают тег B (без дубликата), A удаляется.
create or replace function public.merge_tags(p_from uuid, p_into uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid := public.require_household();
begin
  if not public.is_manager() then
    raise exception 'Недостаточно прав для этого действия' using errcode = 'P0403';
  end if;
  if p_from = p_into then
    raise exception 'Выберите другой тег' using errcode = '23514';
  end if;
  if (select count(*) from public.tags where id in (p_from, p_into) and household_id = v_household) <> 2 then
    raise exception 'Тег не найден' using errcode = 'P0404';
  end if;
  insert into public.transaction_tags (transaction_id, tag_id)
  select transaction_id, p_into from public.transaction_tags where tag_id = p_from
  on conflict do nothing;
  delete from public.tags where id = p_from;
end;
$$;

-- Выход из семьи: участник помечается бывшим, его операции остаются (FR-1.7, FR-1.8).
-- Владелец выйти не может — только удалить семью.
create or replace function public.leave_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_household();
  if public.my_role() = 'owner' then
    raise exception 'Владелец не может выйти из семьи — можно только удалить её' using errcode = 'P0403';
  end if;
  update public.members set removed_at = now() where id = public.my_member_id();
end;
$$;

-- Удаление семьи владельцем (FR-1.9). Простой DELETE семьи не проходит: каскад удаляет
-- категории и участников раньше операций и бюджетов, которые на них ссылаются (ON DELETE RESTRICT
-- защищает от удаления категории с операциями). Поэтому сначала операции и бюджеты, потом семья.
-- Найдено при локальной проверке: ERROR violates foreign key constraint "budget_items_category_id_fkey".
create or replace function public.delete_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid := public.require_household();
begin
  if not public.is_owner() then
    raise exception 'Недостаточно прав для этого действия' using errcode = 'P0403';
  end if;
  delete from public.transactions where household_id = v_household;
  delete from public.budgets where household_id = v_household;
  delete from public.households where id = v_household;
end;
$$;

-- Страж изменений участников из миграции 3 запрещал менять removed_at всем, кроме владельца.
-- Для выхода из семьи разрешаем участнику пометить бывшим САМОГО СЕБЯ (не владельцу).
create or replace function public.guard_member_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_self_leave boolean :=
    old.user_id = auth.uid() and old.role <> 'owner' and old.removed_at is null
    and new.removed_at is not null and new.role = old.role;
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.household_id <> old.household_id or new.user_id is distinct from old.user_id then
    raise exception 'Недостаточно прав для этого действия' using errcode = 'P0403';
  end if;
  if (new.role <> old.role or new.removed_at is distinct from old.removed_at) and not v_is_self_leave then
    if not public.is_owner() or old.role = 'owner' or new.role = 'owner' then
      raise exception 'Недостаточно прав для этого действия' using errcode = 'P0403';
    end if;
  end if;
  return new;
end;
$$;

grant execute on function public.merge_tags(uuid, uuid), public.leave_household(), public.delete_household()
  to authenticated;

-- Supabase Realtime: рассылать изменения операций подписанным клиентам.
-- Правила RLS действуют и здесь: участник получает события только своей семьи.
alter publication supabase_realtime add table public.transactions;
