-- Sécurité : plus aucun accès direct aux tables par l'API REST de Supabase (PostgREST).
-- L'app n'utilise Supabase que pour la connexion ; toutes les données passent par le backend
-- (rôle postgres), qui applique les règles (pseudo figé, visibilité entre amis, validations).
-- Avant, la clé publique + le JWT d'un utilisateur permettaient de modifier directement sa ligne
-- de profiles (pseudo, photo, nom) ou ses titres, en contournant ces règles.
-- La RLS reste activée en défense en profondeur.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

-- Tables, séquences et fonctions créées plus tard par les migrations (rôle qui les exécute :
-- postgres sur Supabase).
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;

-- Photos de profil : jamais envoyées par l'app (initiale ou photo du compte Google).
-- Le bucket reste lisible publiquement, mais plus personne ne peut y écrire avec la clé publique.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    drop policy if exists "avatars: ajout de sa photo" on storage.objects;
    drop policy if exists "avatars: remplacement de sa photo" on storage.objects;
    drop policy if exists "avatars: lecture de sa photo" on storage.objects;
    drop policy if exists "avatars: suppression de sa photo" on storage.objects;
  end if;
end
$$;
