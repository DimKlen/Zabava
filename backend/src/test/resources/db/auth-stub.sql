-- Imitation minimale du schéma auth de Supabase pour les tests (Testcontainers).
create schema if not exists auth;

create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}',
  raw_app_meta_data jsonb not null default '{}'
);

-- Comme Supabase : l'utilisateur courant vient du claim sub du JWT.
create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

-- Rôles des clients directs (clé publique, avec ou sans JWT).
create role anon nologin;
create role authenticated nologin;
grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;

-- Comme Supabase : toute table créée dans public est ouverte à ces rôles par défaut
-- (la migration 0011 retire ces droits).
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
