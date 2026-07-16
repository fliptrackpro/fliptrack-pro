-- A exécuter dans Supabase > SQL Editor
alter table products add column if not exists is_luxury boolean not null default false;
