-- FlipTrack Pro — schema initial
-- A exécuter dans Supabase > SQL Editor sur le projet https://nbfsciusnxdnxvrlxiwo.supabase.co

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  condition text,
  purchase_price numeric not null default 0,
  purchase_fees numeric not null default 0,
  purchase_date date not null default current_date,
  status text not null default 'stock' check (status in ('stock', 'vendu')),
  description text,
  photo_url text,
  last_reposted_at timestamptz,
  estimated_price_min numeric,
  estimated_price_max numeric,
  created_at timestamptz not null default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sale_price numeric not null default 0,
  platform_fees numeric not null default 0,
  platform text,
  sale_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists products_user_id_idx on products(user_id);
create index if not exists sales_user_id_idx on sales(user_id);
create index if not exists sales_product_id_idx on sales(product_id);

alter table products enable row level security;
alter table sales enable row level security;

create policy "products_select_own" on products
  for select using (auth.uid() = user_id);
create policy "products_insert_own" on products
  for insert with check (auth.uid() = user_id);
create policy "products_update_own" on products
  for update using (auth.uid() = user_id);
create policy "products_delete_own" on products
  for delete using (auth.uid() = user_id);

create policy "sales_select_own" on sales
  for select using (auth.uid() = user_id);
create policy "sales_insert_own" on sales
  for insert with check (auth.uid() = user_id);
create policy "sales_update_own" on sales
  for update using (auth.uid() = user_id);
create policy "sales_delete_own" on sales
  for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

create policy "Public read product photos" on storage.objects
  for select using (bucket_id = 'products');

create policy "Users upload own product photos" on storage.objects
  for insert with check (bucket_id = 'products' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users update own product photos" on storage.objects
  for update using (bucket_id = 'products' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own product photos" on storage.objects
  for delete using (bucket_id = 'products' and auth.uid()::text = (storage.foldername(name))[1]);
