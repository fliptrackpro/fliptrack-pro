-- A exécuter dans Supabase > SQL Editor
alter table products add column if not exists last_reposted_at timestamptz;
