-- Table de profils publics minimale : associe un pseudo unique à chaque utilisateur,
-- pour permettre la connexion par pseudo en plus de l'email.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Lecture publique du pseudo uniquement (aucune donnée sensible dans cette table :
-- pas d'email, pas de mot de passe) : nécessaire pour vérifier la disponibilité d'un
-- pseudo à l'inscription sans passer par la clé service role.
create policy "Pseudos lisibles publiquement" on public.profiles
  for select using (true);

-- Permet aux comptes créés avant cette migration de définir leur pseudo depuis la page Compte
create policy "Un utilisateur peut créer son propre profil" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "Un utilisateur peut modifier son propre profil" on public.profiles
  for update using (auth.uid() = user_id);

-- Remplit automatiquement la table profiles à la création d'un compte, à partir du
-- pseudo fourni dans les métadonnées de signUp (options.data.username). Fonctionne
-- même si l'email n'est pas encore confirmé (le trigger tourne côté serveur, pas via
-- une requête authentifiée du client).
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
