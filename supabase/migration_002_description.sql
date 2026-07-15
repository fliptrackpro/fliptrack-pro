-- A exécuter dans Supabase > SQL Editor (le schéma de base a déjà été créé)
alter table products add column if not exists description text;
