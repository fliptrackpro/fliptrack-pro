-- Suivi des annonces : où chaque article est réellement publié (une ligne par plateforme).
-- Un produit peut avoir plusieurs annonces actives simultanément (Vinted + Leboncoin + ...).
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  listed_price numeric,
  url text,
  status text not null default 'active' check (status in ('active', 'sold', 'expired')),
  listed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists listings_user_id_idx on public.listings(user_id);
create index if not exists listings_product_id_idx on public.listings(product_id);
create index if not exists listings_status_idx on public.listings(status);

alter table public.listings enable row level security;

create policy "listings_select_own" on public.listings
  for select using (auth.uid() = user_id);
create policy "listings_insert_own" on public.listings
  for insert with check (auth.uid() = user_id);
create policy "listings_update_own" on public.listings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "listings_delete_own" on public.listings
  for delete using (auth.uid() = user_id);
