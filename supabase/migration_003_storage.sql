-- A exécuter dans Supabase > SQL Editor

alter table products add column if not exists photo_url text;

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
