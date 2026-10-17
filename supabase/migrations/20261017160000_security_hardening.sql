-- =============================================================================
-- Миграция 5. Усиление безопасности по замечаниям Supabase Security Advisor (ДЗ6, шаг 2).
--
-- 1. «Public Can Execute SECURITY DEFINER Function»: Supabase по умолчанию даёт право
--    вызова новых функций ролям anon и authenticated. Миграция 2 закрыла от гостя свои
--    функции, но функции миграций 3 и 4 остались открытыми. Вред был невозможен (каждая
--    сразу проверяет вход: P0401), но доступ должен закрываться правами, а не только кодом.
-- 2. «Function Search Path Mutable»: у триггерных функций не был закреплён search_path —
--    теоретически можно подменить вызываемую функцию объектом с тем же именем.
-- 3. Служебные функции (используются только внутри других функций и триггеров)
--    закрыты и от вошедших пользователей: снаружи их вызывать незачем.
-- =============================================================================

-- 2. Закрепить search_path у триггерных функций.
alter function public.set_updated_at()       set search_path = public;
alter function public.check_subcategory()    set search_path = public;
alter function public.check_transaction()    set search_path = public;
alter function public.check_transaction_tag() set search_path = public;
alter function public.check_budget_item()    set search_path = public;

-- 1. Гость (anon) и «все» (PUBLIC) не вызывают ни одну функцию схемы public.
revoke execute on all functions in schema public from public, anon;

-- Новые функции тоже не должны открываться автоматически.
alter default privileges in schema public revoke execute on functions from public, anon;

-- 3. Служебные функции: только для триггеров и других функций (они работают с правами
--    владельца базы, поэтому им право authenticated не нужно). Триггерам право EXECUTE
--    не требуется вовсе — PostgreSQL проверяет его только при создании триггера.
revoke execute on function
  public.require_household(),
  public.set_transaction_tags(uuid, uuid, text[]),
  public.editable_transaction(uuid),
  public.set_updated_at(),
  public.check_subcategory(),
  public.check_transaction(),
  public.check_transaction_tag(),
  public.check_budget_item(),
  public.guard_member_update()
from authenticated;

-- Функции, которые вызывает сайт или правила RLS, — только вошедшим пользователям.
grant execute on function
  public.my_member_id(), public.my_household_id(), public.my_role(),
  public.is_manager(), public.is_owner(),
  public.create_household(text, text), public.create_invite(text), public.accept_invite(text, text),
  public.list_transactions(date, date, text, text, uuid[], uuid[], uuid[], uuid[], integer, integer),
  public.period_summary(date, date, text, text, uuid[], uuid[], uuid[], uuid[]),
  public.transaction_matches(public.transactions, text, text, uuid[], uuid[], uuid[], uuid[]),
  public.create_transaction(uuid, text, bigint, uuid, date, text, text[]),
  public.update_transaction(uuid, timestamptz, text, bigint, uuid, date, text, text[]),
  public.delete_transaction(uuid), public.restore_transaction(uuid),
  public.report_by_category(date, date, text), public.report_by_subcategory(date, date, uuid),
  public.report_by_tag(date, date, text), public.budget_status(date, date),
  public.merge_tags(uuid, uuid), public.leave_household(), public.delete_household()
to authenticated;
