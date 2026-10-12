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

-- Rôle des clients directs (clé anon + JWT), soumis à la RLS.
create role authenticated nologin;
grant usage on schema public to authenticated;
grant usage on schema auth to authenticated;
