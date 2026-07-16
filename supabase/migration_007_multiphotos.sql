-- A exécuter dans Supabase > SQL Editor
-- photo_url reste la photo principale (miniatures partout dans l'app).
-- photo_urls contient TOUTES les photos (y compris la principale en premier), pour la galerie sur la page Publier.
alter table products add column if not exists photo_urls jsonb not null default '[]'::jsonb;
