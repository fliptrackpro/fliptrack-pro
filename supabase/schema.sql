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
  photo_urls jsonb not null default '[]'::jsonb,
  last_reposted_at timestamptz,
  estimated_price_min numeric,
  estimated_price_max numeric,
  is_luxury boolean not null default false,
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

-- Profils publics minimaux : pseudo unique par utilisateur, pour la connexion par pseudo
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Pseudos lisibles publiquement" on public.profiles
  for select using (true);

create policy "Un utilisateur peut créer son propre profil" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "Un utilisateur peut modifier son propre profil" on public.profiles
  for update using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'username' and new.raw_user_meta_data->>'username' <> '' then
    insert into public.profiles (user_id, username)
    values (new.id, lower(new.raw_user_meta_data->>'username'))
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
