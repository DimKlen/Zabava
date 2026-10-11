-- Schéma initial de Zabava — specs/docs/11-backend-api.md §2.
-- Ajouts par rapport à la spec (voir les commentaires « Ajout ») :
--   profiles.timezone (§4 de la spec), provider_regions, création automatique
--   du profil à l'inscription, RLS sur les tables du catalogue, index utiles.

-- ─── Utilisateurs ──────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  email text,
  auth_provider text,
  region text not null default 'CA',
  language text not null default 'fr-CA',
  spoiler_protection boolean not null default false,
  notification_prefs jsonb not null
    default '{"episodes":true,"cinema":true,"streaming":true,"seasons":true,"digest_hour":9}',
  -- Ajout prévu par §4 : fuseau envoyé par l'app avec le jeton push.
  timezone text not null default 'America/Toronto',
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table user_providers (
  user_id uuid references profiles on delete cascade,
  provider_id int not null,
  primary key (user_id, provider_id)
);

create table push_tokens (
  user_id uuid references profiles on delete cascade,
  expo_token text not null,
  platform text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, expo_token)
);

-- ─── Catalogue (cache des sources) ─────────────────────────────────────────
create table titles (
  id bigserial primary key,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  is_anime boolean not null default false,
  imdb_id text,
  tvmaze_id int,
  title text not null,
  original_title text,
  overview text,
  poster_path text,
  backdrop_path text,
  genres text[] not null default '{}',
  status text,
  ended boolean,
  network text,
  runtime int,
  original_language text,
  origin_country text,
  studio text,
  certification text,
  collection_id int,
  imdb_rating numeric(3, 1),
  imdb_votes int,
  rt_score int,
  ratings_updated_at timestamptz,
  trailer_key text,
  popularity numeric,
  updated_at timestamptz not null default now(),
  unique (media_type, tmdb_id)
);

create table seasons (
  id bigserial primary key,
  title_id bigint references titles on delete cascade,
  season_number int not null,
  name text,
  episode_count int,
  air_date date,
  poster_path text,
  unique (title_id, season_number)
);

create table episodes (
  id bigserial primary key,
  title_id bigint references titles on delete cascade,
  season_number int not null,
  episode_number int not null,
  name text,
  overview text,
  still_path text,
  air_date date,
  airstamp timestamptz,
  runtime int,
  imdb_rating numeric(3, 1),
  unique (title_id, season_number, episode_number)
);

create table release_dates (
  title_id bigint references titles on delete cascade,
  region text not null,
  type text not null check (type in ('salle', 'numerique', 'physique')),
  date date not null,
  primary key (title_id, region, type)
);

create table title_availability (
  title_id bigint references titles on delete cascade,
  region text not null,
  provider_id int not null,
  type text not null check (type in ('abonnement', 'location', 'achat')),
  first_seen_at timestamptz not null default now(),
  link text,
  primary key (title_id, region, provider_id, type)
);

create table providers (
  id int primary key,
  name text not null,
  short text,
  logo_path text,
  display_priority int
);

-- Ajout : plateformes d'abonnement proposées par région (GET /providers,
-- onboarding). La table providers de la spec n'a pas de colonne région.
create table provider_regions (
  provider_id int references providers on delete cascade,
  region text not null,
  display_priority int,
  primary key (provider_id, region)
);

-- ─── Suivi ─────────────────────────────────────────────────────────────────
create table user_titles (
  user_id uuid references profiles on delete cascade,
  title_id bigint references titles on delete cascade,
  status text not null check (status in ('towatch', 'watched', 'following', 'abandoned')),
  added_at timestamptz not null default now(),
  watched_at timestamptz,
  notifications_enabled boolean not null default true,
  primary key (user_id, title_id)
);

create table user_episodes (
  user_id uuid references profiles on delete cascade,
  episode_id bigint references episodes on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (user_id, episode_id)
);

create table notifications_log (
  id bigserial primary key,
  user_id uuid references profiles on delete cascade,
  title_id bigint,
  episode_id bigint,
  type text not null,
  sent_at timestamptz not null default now()
);

create unique index notif_once
  on notifications_log (user_id, coalesce(title_id, 0), coalesce(episode_id, 0), type);
create index on episodes (airstamp);
create index on user_titles (title_id);
-- Ajout : index pour les requêtes fréquentes.
create index on episodes (title_id, season_number);
create index on title_availability (title_id, region);
create index on provider_regions (region);

-- ─── Sécurité : RLS ────────────────────────────────────────────────────────
-- Le backend se connecte avec un rôle de service (RLS contournée).
-- Tables utilisateur : chacun ne voit que ses lignes (spec).
alter table profiles enable row level security;
create policy own on profiles using (id = auth.uid());
alter table user_providers enable row level security;
create policy own on user_providers using (user_id = auth.uid());
alter table push_tokens enable row level security;
create policy own on push_tokens using (user_id = auth.uid());
alter table user_titles enable row level security;
create policy own on user_titles using (user_id = auth.uid());
alter table user_episodes enable row level security;
create policy own on user_episodes using (user_id = auth.uid());

-- Ajout : sans RLS, Supabase exposerait ces tables en écriture aux clés
-- anon/authenticated via son API REST. Aucune politique = aucun accès direct ;
-- l'app passe par le backend.
alter table notifications_log enable row level security;
alter table titles enable row level security;
alter table seasons enable row level security;
alter table episodes enable row level security;
alter table release_dates enable row level security;
alter table title_availability enable row level security;
alter table providers enable row level security;
alter table provider_regions enable row level security;

-- ─── Création du profil à l'inscription ────────────────────────────────────
-- Ajout : Supabase Auth crée la ligne auth.users ; on crée le profil aussitôt
-- (nom, avatar et e-mail du fournisseur OAuth, région et langue par défaut).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, auth_provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_app_meta_data ->> 'provider'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
