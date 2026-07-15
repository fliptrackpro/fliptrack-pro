-- A exécuter dans Supabase > SQL Editor
alter table products add column if not exists estimated_price_min numeric;
alter table products add column if not exists estimated_price_max numeric;
