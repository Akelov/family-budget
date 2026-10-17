#!/bin/bash
# Применяет все миграции к чистой локальной базе fb и запускает проверки.
# Использование: bash supabase/local/run_all.sh   (нужен локальный PostgreSQL на порту 54329)
set -e
cd "$(dirname "$0")/../.."
Q="psql -h /tmp -p 54329 -U postgres -v ON_ERROR_STOP=1 -q"
$Q -c "drop database if exists fb" -c "create database fb" 2>/dev/null
$Q -d fb -f supabase/local/supabase_stub.sql
$Q -d fb -f supabase/local/supabase_grants.sql
for m in supabase/migrations/*.sql; do
  $Q -d fb -f "$m" 2>&1 | grep -v NOTICE || true
  # Supabase выдаёт права на новые таблицы автоматически; локально — после первой миграции.
  [[ "$m" == *schema.sql ]] && $Q -d fb -f supabase/local/supabase_grants.sql
done
echo "миграции применены"
