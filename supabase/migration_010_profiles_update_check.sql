-- Défense en profondeur : la policy UPDATE de profiles n'avait qu'une clause USING (quelles
-- lignes sont modifiables) mais pas de WITH CHECK (ce que peut devenir la ligne après update).
-- Sans WITH CHECK, un utilisateur pouvait théoriquement réaffecter user_id à un autre compte.
-- On ajoute la contrainte pour que la ligne reste rattachée à lui après modification.
drop policy if exists "Un utilisateur peut modifier son propre profil" on public.profiles;

create policy "Un utilisateur peut modifier son propre profil" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
