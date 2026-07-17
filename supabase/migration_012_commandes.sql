-- COMMANDES : suivi du cycle complet
--   Achats : un article peut être "commandé" (payé, en transit) avant d'entrer en stock.
--   Ventes : une vente peut être "à expédier / expédiée / livrée" avant d'être finalisée.

-- 1) Achats en attente de livraison ------------------------------------------------
-- Ajoute le statut 'commande' aux produits (avant 'stock') + une date de livraison estimée.
alter table public.products drop constraint if exists products_status_check;
alter table public.products
  add constraint products_status_check check (status in ('commande', 'stock', 'vendu'));

alter table public.products add column if not exists expected_delivery_date date;

-- 2) Ventes en cours d'expédition --------------------------------------------------
-- Statut d'expédition d'une vente. 'completed' par défaut pour ne pas casser l'historique
-- existant (les ventes déjà enregistrées sont considérées finalisées).
alter table public.sales
  add column if not exists shipping_status text not null default 'completed'
  check (shipping_status in ('to_ship', 'shipped', 'delivered', 'completed'));

alter table public.sales add column if not exists shipped_at timestamptz;
