-- =============================================================================
-- Миграция 6. Журнал ошибок сайта: уровни info / warning / error и версия сборки
-- (ДЗ6, шаг 7).
--   • level: добавлен уровень info (раньше только error и warning);
--   • app_version: первые 7 символов коммита — видно, после какой публикации
--     появилась ошибка;
--   • индекс по времени — запросы «последние ошибки» не читают всю таблицу.
-- Права не меняются: вошедший пользователь только добавляет запись, читать журнал
-- может лишь владелец проекта в панели Supabase.
-- =============================================================================

alter table public.client_errors drop constraint if exists client_errors_level_check;
alter table public.client_errors
  add constraint client_errors_level_check check (level in ('info', 'warning', 'error'));

alter table public.client_errors
  add column if not exists app_version text check (char_length(app_version) <= 40);

create index if not exists client_errors_created_at_idx on public.client_errors (created_at desc);
