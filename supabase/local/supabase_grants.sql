-- Права, которые Supabase по умолчанию выдаёт ролям API на таблицы схемы public.
-- Нужны только для локальной проверки; в Supabase уже настроены.
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
