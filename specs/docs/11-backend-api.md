# 11 — Backend, API, données

Source : spec PDF §7 et §8, complétée.

## 1. Architecture
```
App Expo ──HTTPS + JWT Supabase──▶ Spring Boot API ──▶ Postgres (Supabase)
     │                                  │──▶ TMDB (catalogue, JustWatch via watch/providers)
     └──OAuth──▶ Supabase Auth          │──▶ OMDb (notes IMDb / RT)
                                        │──▶ TVmaze (heures de diffusion exactes)
                                        └──▶ Expo Push API
```
- L'app ne parle **qu'au backend** (et à Supabase Auth pour la connexion). Aucune clé TMDB/OMDb dans l'app.
- Spring Boot 3 / Java 21. Vérification du JWT Supabase à chaque requête (`spring-boot-starter-oauth2-resource-server`, JWKS `https://{projet}.supabase.co/auth/v1/.well-known/jwks.json`, ou secret HS256 selon la configuration du projet). `sub` = `profiles.id`.
- Le backend se connecte à Postgres avec un rôle de service. La RLS protège en plus les tables utilisateur pour tout accès direct.
- Cache : les fiches TMDB sont gardées 24 h, les notes OMDb 7 jours, les plateformes 24 h. Les titres présents dans au moins une watchlist sont rafraîchis par les tâches planifiées ; les autres seulement quand on les consulte.

## 2. Schéma SQL (`supabase/migrations/0001_init.sql`)
```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text, avatar_url text, email text, auth_provider text,
  region text not null default 'CA', language text not null default 'fr-CA',
  spoiler_protection boolean not null default false,
  notification_prefs jsonb not null default '{"episodes":true,"cinema":true,"streaming":true,"seasons":true,"digest_hour":9}',
  onboarded_at timestamptz, created_at timestamptz not null default now()
);
create table user_providers (user_id uuid references profiles on delete cascade, provider_id int not null, primary key (user_id, provider_id));
create table push_tokens (user_id uuid references profiles on delete cascade, expo_token text not null, platform text not null, updated_at timestamptz not null default now(), primary key (user_id, expo_token));

create table titles (
  id bigserial primary key, tmdb_id int not null, media_type text not null check (media_type in ('movie','tv')),
  is_anime boolean not null default false, imdb_id text, tvmaze_id int,
  title text not null, original_title text, overview text, poster_path text, backdrop_path text,
  genres text[] not null default '{}', status text, ended boolean, network text, runtime int,
  original_language text, origin_country text, studio text, certification text, collection_id int,
  imdb_rating numeric(3,1), imdb_votes int, rt_score int, ratings_updated_at timestamptz,
  trailer_key text, popularity numeric, updated_at timestamptz not null default now(),
  unique (media_type, tmdb_id)
);
create table seasons (id bigserial primary key, title_id bigint references titles on delete cascade, season_number int not null, name text, episode_count int, air_date date, poster_path text, unique (title_id, season_number));
create table episodes (
  id bigserial primary key, title_id bigint references titles on delete cascade,
  season_number int not null, episode_number int not null, name text, overview text, still_path text,
  air_date date, airstamp timestamptz, runtime int, imdb_rating numeric(3,1),
  unique (title_id, season_number, episode_number)
);
create table release_dates (title_id bigint references titles on delete cascade, region text not null, type text not null check (type in ('salle','numerique','physique')), date date not null, primary key (title_id, region, type));
create table title_availability (title_id bigint references titles on delete cascade, region text not null, provider_id int not null, type text not null check (type in ('abonnement','location','achat')), first_seen_at timestamptz not null default now(), link text, primary key (title_id, region, provider_id, type));
create table providers (id int primary key, name text not null, short text, logo_path text, display_priority int);

create table user_titles (
  user_id uuid references profiles on delete cascade, title_id bigint references titles on delete cascade,
  status text not null check (status in ('towatch','watched','following','abandoned')),
  added_at timestamptz not null default now(), watched_at timestamptz,
  notifications_enabled boolean not null default true, primary key (user_id, title_id)
);
create table user_episodes (user_id uuid references profiles on delete cascade, episode_id bigint references episodes on delete cascade, watched_at timestamptz not null default now(), primary key (user_id, episode_id));
create table notifications_log (id bigserial primary key, user_id uuid references profiles on delete cascade, title_id bigint, episode_id bigint, type text not null, sent_at timestamptz not null default now());
create unique index notif_once on notifications_log (user_id, coalesce(title_id,0), coalesce(episode_id,0), type);
create index on episodes (airstamp);
create index on user_titles (title_id);

alter table profiles enable row level security;       create policy own on profiles       using (id = auth.uid());
alter table user_providers enable row level security; create policy own on user_providers using (user_id = auth.uid());
alter table push_tokens enable row level security;    create policy own on push_tokens    using (user_id = auth.uid());
alter table user_titles enable row level security;    create policy own on user_titles    using (user_id = auth.uid());
alter table user_episodes enable row level security;  create policy own on user_episodes  using (user_id = auth.uid());
```
`media_type` reste `movie|tv` en base ; `anime` est une vue dérivée de `is_anime`.
Règle `is_anime` : `'Animation' = any(genres)` et (`origin_country = 'JP'` ou mot-clé TMDB 210024).

## 3. Endpoints
Préfixe `/api/v1`. JSON camelCase. Erreurs : `{ "error": { "code": "...", "message": "..." } }`. Paramètres `region` et `language` déduits du profil.

| Méthode | Route | Paramètres / corps | Réponse |
|---|---|---|---|
| GET | `/search` | `q`, `type=all|movie|tv|anime|person`, `page` | `{ people: PersonLite[], titles: TitleLite[], page, totalPages }` |
| GET | `/discover` | `type`, `genres` (csv), `cast` (csv d'ids, ET), `yearFrom`, `yearTo`, `minRating`, `providers=mine|{id}`, `lang`, `maxRuntime`, `sort=pop|rating|recent`, `page` ; ou `list=trending|now_playing|upcoming|new_on_mine|top_rated|new_seasons|popular_on_mine|season_anime` | `{ results: TitleLite[], total, page }` |
| GET | `/discover/count` | mêmes filtres | `{ total }` |
| GET | `/titles/{type}/{tmdbId}` | — | `Title` complet + `cast` (15), `crew`, `collection`, `similar` (8), `availability`, `userTitle?` |
| GET | `/titles/tv/{tmdbId}/seasons/{n}` | — | `Season` avec ses épisodes et `watchedAt` par épisode |
| GET | `/people/{id}` | — | `{ id, name, profilePath, gender, birthday, placeOfBirth, biography, credits: TitleLite[] }` |
| GET | `/trending` | `type`, `window=day|week` | `TitleLite[]` |
| GET | `/me/profile` · PUT `/me/profile` | `{region?, language?, spoilerProtection?, notificationPrefs?, onboardedAt?}` | `Profile` |
| PUT | `/me/providers` | `{ providerIds: number[] }` | 204 |
| GET | `/providers` | région du profil | `Provider[]` (abonnement, triés par `display_priority`) |
| GET | `/me/watchlist` | `type=movie|tv|anime` | `WatchlistItem[]` = TitleLite + availability + userTitle (+ épisodes de toutes les saisons, avec `watchedAt`, pour les séries) |
| POST | `/me/titles` | `{ tmdbId, type, status }` | `UserTitle` (crée le titre en base s'il n'existe pas) |
| PATCH | `/me/titles/{titleId}` | `{ status?, watchedAt?, notificationsEnabled? }` | `UserTitle` |
| DELETE | `/me/titles/{titleId}` | — | 204 (supprime aussi les `user_episodes` du titre) |
| POST | `/me/episodes/watched` | `{ episodeIds: number[], watchedAt? }` | 204 (idempotent ; crée `user_titles following` si absent) |
| DELETE | `/me/episodes/watched` | `{ episodeIds: number[] }` | 204 |
| GET | `/me/upcoming` | `from`, `to`, `type` | `{ events: UpcomingEvent[], noDate: TitleLite[] }` |
| POST | `/me/push-token` | `{ expoToken, platform }` | 204 |
| DELETE | `/me` | — | 204 : supprime le compte Supabase (Admin API) et toutes les données en cascade |

`UpcomingEvent = { date: string /*ISO local*/, kind: 'episode'|'theatrical'|'streaming'|'digital', title: TitleLite, season?, episode?, airstamp?, provider? }`

## 4. Tâches planifiées (Spring Scheduler, fuseau UTC)
| Tâche | Fréquence | Rôle |
|---|---|---|
| `SyncEpisodesJob` | tous les jours à 03:00 | séries suivies : `/tv/changes` de TMDB depuis la dernière exécution → mise à jour des saisons et épisodes ; heures exactes via TVmaze (`/lookup/shows?imdb=` puis `/shows/{id}/episodes`) pour `airstamp` |
| `SyncAvailabilityJob` | tous les jours à 04:00 | films en watchlist : `watch/providers` et `release_dates` par région ; insère les nouvelles lignes de `title_availability` (`first_seen_at`) |
| `RefreshRatingsJob` | toutes les semaines, lundi 05:00 | OMDb pour les titres en watchlist (quota d'environ 1 000 appels par jour : traiter par lots, les plus anciens `ratings_updated_at` d'abord) |
| `DispatchNotificationsJob` | toutes les 15 min | calcule les notifications dues (règles de `01` §7), les dédoublonne avec `notifications_log`, regroupe à partir de 4 épisodes, respecte les fenêtres horaires dans le fuseau de l'utilisateur, envoie par lots de 100 à l'Expo Push API, supprime les jetons `DeviceNotRegistered` |

Fuseau de l'utilisateur : envoyé par l'app à chaque `POST /me/push-token` (`timezone`, depuis `expo-localization`) et stocké dans `profiles.timezone` (à ajouter : `alter table profiles add column timezone text default 'America/Toronto'`).

## 5. Sources de données
| Source | Usage | Contraintes |
|---|---|---|
| TMDB API v3 | catalogue, recherche, discover, fiches, saisons, épisodes, casting, images, vidéos, dates de sortie par région, recommandations, identifiants IMDb, mots-clés | gratuit en usage non commercial ; logo et mention TMDB obligatoires ; licence pour un usage commercial |
| JustWatch (via TMDB `watch/providers`) | plateformes par région : abonnement (`flatrate`), location (`rent`), achat (`buy`) | attribution JustWatch obligatoire ; lien vers la page du titre, pas vers un épisode |
| OMDb | note IMDb + votes, Tomatometer, note IMDb par épisode | clé requise ; environ 1 000 requêtes par jour en gratuit ; le score public RT (Popcornmeter) n'est pas fourni |
| TVmaze | heure de diffusion exacte avec fuseau | gratuit, CC BY-SA ; correspondance par identifiant IMDb |
| Supabase Auth | OAuth Google et Apple, sessions | configurer Apple (Services ID, clé) et Google (clients iOS, Android, web) |
| Expo Push | envoi des notifications iOS et Android | jeton par appareil |

Images : `https://image.tmdb.org/t/p/{w92|w185|w300|w342|w780}{path}`.

## 6. Variables d'environnement
Backend : `SUPABASE_URL`, `SUPABASE_JWT_SECRET` (ou JWKS), `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `TMDB_API_KEY` (v4 bearer), `OMDB_API_KEY`, `EXPO_ACCESS_TOKEN`.
Mobile (`app.config.ts`, `extra`) : `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_DEEPLINK_SCHEME=suivi`.
