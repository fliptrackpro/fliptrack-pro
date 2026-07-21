-- Persistance des annonces générées par l'IA.
--
-- Elles ne vivaient que dans l'état du composant : générer → ouvrir Vinted dans un
-- autre onglet → revenir = tout était perdu, il fallait régénérer et donc reconsommer
-- du quota IA. Or le flux impose justement de quitter la page pour publier.
alter table public.products
  add column if not exists generated_listings jsonb,
  add column if not exists listings_generated_at timestamptz;
