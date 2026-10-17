-- Права, которые Supabase по умолчанию выдаёт ролям API на таблицы схемы public.
-- Нужны только для локальной проверки; в Supabase уже настроены.
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
-- Как в Supabase: новые функции схемы public по умолчанию доступны ролям API (в том числе anon).
-- Поэтому каждая миграция обязана сама закрывать доступ — это проверяет endpoints_check.sql.
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
