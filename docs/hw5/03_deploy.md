# Шаг 3. Развёртывание базы в Supabase

1. Владелец продукта зарегистрировался на supabase.com через GitHub и создал проект
   `family-budget` (бесплатный тариф, регион Central EU — Frankfurt). Пароль базы хранится
   только у владельца и в репозиторий не попадает.
2. Схема из шага 1 применена через **SQL Editor**: содержимое
   `supabase/migrations/20261017120000_schema.sql` вставлено и выполнено (`Success. No rows returned`).
3. В Table Editor появились 11 таблиц, у всех включён RLS.

## Проверка через API (выполнил AI-агент)

Адрес проекта и публичный ключ сохранены в `.env.local` (файл в `.gitignore`).

| Запрос | Ответ | Что это значит |
|---|---|---|
| `GET /rest/v1/households` с публичным ключом | `200 []` | таблица есть, но RLS ничего не показывает без входа и правил |
| `GET /rest/v1/nope` | `404 PGRST205 Could not find the table` | для сравнения: несуществующая таблица |
| `POST /rest/v1/households {"name":"Взлом"}` без входа | `401 42501 new row violates row-level security policy` | записать без входа нельзя — защита по умолчанию работает |
| `GET /auth/v1/settings` | `email: true`, `mailer_autoconfirm: false` | вход по email включён, письмо-подтверждение обязательно |
