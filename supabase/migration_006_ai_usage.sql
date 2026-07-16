-- A exécuter dans Supabase > SQL Editor
-- Compteur d'appels IA par utilisateur et par jour (protection quota + base pour futurs paliers payants)

create table if not exists ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table ai_usage enable row level security;

create policy "ai_usage_select_own" on ai_usage
  for select using (auth.uid() = user_id);

-- Incrément atomique, appelé côté serveur pour chaque requête IA
create or replace function increment_ai_usage()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare new_count integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into ai_usage (user_id, day, count)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, day)
  do update set count = ai_usage.count + 1
  returning count into new_count;
  return new_count;
end;
$$;
