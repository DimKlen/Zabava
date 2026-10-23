-- Photos de profil (specs/social/docs/04 §4.3) : bucket public `avatars`, un fichier par
-- utilisateur ({id}.jpg), que seul son propriétaire peut écrire ou supprimer.
-- Le schéma storage n'existe que sur Supabase (absent des tests Testcontainers).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('avatars', 'avatars', true, 1048576, array['image/jpeg'])
    on conflict (id) do nothing;

    drop policy if exists "avatars: ajout de sa photo" on storage.objects;
    create policy "avatars: ajout de sa photo" on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg');

    drop policy if exists "avatars: remplacement de sa photo" on storage.objects;
    create policy "avatars: remplacement de sa photo" on storage.objects for update to authenticated
      using (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg');

    drop policy if exists "avatars: lecture de sa photo" on storage.objects;
    create policy "avatars: lecture de sa photo" on storage.objects for select to authenticated
      using (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg');

    drop policy if exists "avatars: suppression de sa photo" on storage.objects;
    create policy "avatars: suppression de sa photo" on storage.objects for delete to authenticated
      using (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg');
  end if;
end $$;
