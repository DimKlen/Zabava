-- Partie sociale V1 « Suivre des utilisateurs » — specs/social/docs/06 §1.
-- Écarts avec la spec (voir les commentaires « Écart ») :
--   pseudo en text (la contrainte n'admet que des minuscules : citext n'apporte rien),
--   jour des activités dans le fuseau de l'utilisateur, tables follow_quota et follow_removals.

-- Recherche sans accents (unaccent), dans le schéma extensions comme sur Supabase.
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

-- ─── Profils ───────────────────────────────────────────────────────────────
-- Écart : text au lieu de citext ; la contrainte impose déjà les minuscules.
alter table profiles
  add column username text unique,
  add column username_changed_at timestamptz,
  add column is_private boolean not null default false,
  add column followers_count int not null default 0,
  add column following_count int not null default 0;
alter table profiles add constraint username_format
  check (username is null or username ~ '^[a-z0-9._]{3,20}$');
-- Interrupteurs « Nouvel abonné » et « Demandes d'abonnement » (absents = activés).
alter table profiles alter column notification_prefs set default
  '{"episodes":true,"cinema":true,"streaming":true,"seasons":true,"digest_hour":9,"new_follower":true,"follow_requests":true}';

-- Anciens pseudos, réservés 30 jours après un changement.
create table username_history (
  username text primary key,
  user_id uuid not null references profiles on delete cascade,
  released_at timestamptz not null
);

-- ─── Abonnements ───────────────────────────────────────────────────────────
create table follows (
  follower_id uuid not null references profiles on delete cascade,
  followee_id uuid not null references profiles on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee on follows (followee_id, status, accepted_at desc);
create index follows_follower on follows (follower_id, status, accepted_at desc);

-- Ajout : abonnements retirés récemment, pour que « Annuler » rétablisse l'abonnement
-- d'origine (mêmes dates) au lieu d'en créer un nouveau. Purgé après un jour.
create table follow_removals (
  follower_id uuid not null references profiles on delete cascade,
  followee_id uuid not null references profiles on delete cascade,
  removed_by uuid not null references profiles on delete cascade,
  created_at timestamptz not null,
  accepted_at timestamptz,
  removed_at timestamptz not null default now(),
  primary key (follower_id, followee_id)
);

-- Ajout : limite de 200 nouveaux abonnements par jour UTC (docs/06 §4, sans Redis).
create table follow_quota (
  user_id uuid not null references profiles on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);

-- Compteurs d'abonnés et d'abonnements : seuls les abonnements acceptés comptent.
create function public.follows_counters()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.status = 'accepted' then
    update public.profiles set followers_count = followers_count - 1 where id = old.followee_id;
    update public.profiles set following_count = following_count - 1 where id = old.follower_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.status = 'accepted' then
    update public.profiles set followers_count = followers_count + 1 where id = new.followee_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
  end if;
  return null;
end;
$$;

create trigger follows_counters
  after insert or update of status or delete on follows
  for each row execute function public.follows_counters();

-- ─── Blocages et signalements ─────────────────────────────────────────────
create table blocks (
  blocker_id uuid not null references profiles on delete cascade,
  blocked_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked on blocks (blocked_id);

create table reports (
  id bigserial primary key,
  reporter_id uuid not null references profiles on delete cascade,
  reported_id uuid not null references profiles on delete cascade,
  reason text not null check (reason in ('inappropriate', 'impersonation', 'spam')),
  created_at timestamptz not null default now(),
  unique (reporter_id, reported_id, reason)
);

-- ─── Activités ─────────────────────────────────────────────────────────────
-- Écart : activity_date est le jour dans le fuseau de l'utilisateur (écrit par le backend),
-- pour qu'une soirée à Toronto ne soit pas coupée en deux jours UTC.
create table activities (
  id bigserial primary key,
  user_id uuid not null references profiles on delete cascade,
  type text not null check (type in
    ('added', 'watched_movie', 'started_show', 'watched_episodes', 'finished_show', 'followed')),
  title_id bigint references titles on delete cascade,
  episode_id bigint references episodes on delete set null,
  target_user_id uuid references profiles on delete cascade,
  count int not null default 1,
  activity_date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index activities_user_time on activities (user_id, updated_at desc);
create unique index activities_eps_day on activities (user_id, title_id, activity_date)
  where type = 'watched_episodes';
-- Ajout : une seule activité de chaque type par titre (recalculées à partir de l'état du suivi).
create unique index activities_title_once on activities (user_id, title_id, type)
  where type in ('added', 'watched_movie', 'started_show', 'finished_show');
create unique index activities_followed_once on activities (user_id, target_user_id)
  where type = 'followed';

create table recent_profile_visits (
  user_id uuid not null references profiles on delete cascade,
  visited_id uuid not null references profiles on delete cascade,
  visited_at timestamptz not null default now(),
  primary key (user_id, visited_id)
);

-- ─── Sécurité : RLS ────────────────────────────────────────────────────────
-- Lecture des autres uniquement par le backend (rôle de service), qui applique les règles
-- de visibilité. Clients directs : lecture seule de leurs propres lignes (écart : `for select`,
-- sinon un client pourrait s'abonner directement à un profil privé en contournant le backend).
alter table follows enable row level security;
create policy own on follows for select using (follower_id = auth.uid() or followee_id = auth.uid());
alter table blocks enable row level security;
create policy own on blocks for select using (blocker_id = auth.uid());
alter table reports enable row level security;
create policy own on reports for select using (reporter_id = auth.uid());
alter table activities enable row level security;
create policy own on activities for select using (user_id = auth.uid());
alter table recent_profile_visits enable row level security;
create policy own on recent_profile_visits for select using (user_id = auth.uid());
-- Aucune politique = aucun accès direct.
alter table username_history enable row level security;
alter table follow_removals enable row level security;
alter table follow_quota enable row level security;
