# 06 — Données et API

Adapte les noms au schéma existant (`profiles`, `titles`, `episodes`, `user_titles`, `user_episodes`, `notifications_log`, `push_tokens`). Backend Spring Boot + Supabase Postgres, comme le reste de l'app.

## 1. Migration SQL (`supabase/migrations/XXXX_social.sql`)
```sql
create extension if not exists citext;

alter table profiles
  add column username citext unique,
  add column username_changed_at timestamptz,
  add column is_private boolean not null default false,
  add column followers_count int not null default 0,
  add column following_count int not null default 0;
alter table profiles add constraint username_format check (username is null or username ~ '^[a-z0-9._]{3,20}$');
-- notification_prefs (jsonb) : ajouter les clés "new_follower": true, "follow_requests": true

create table username_history (
  username citext primary key,
  user_id uuid not null references profiles on delete cascade,
  released_at timestamptz not null          -- = date du changement + 30 jours
);

create table follows (
  follower_id uuid not null references profiles on delete cascade,
  followee_id uuid not null references profiles on delete cascade,
  status text not null check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee on follows (followee_id, status, accepted_at desc);
create index follows_follower on follows (follower_id, status, accepted_at desc);

create table blocks (
  blocker_id uuid not null references profiles on delete cascade,
  blocked_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table reports (
  id bigserial primary key,
  reporter_id uuid not null references profiles on delete cascade,
  reported_id uuid not null references profiles on delete cascade,
  reason text not null check (reason in ('inappropriate','impersonation','spam')),
  created_at timestamptz not null default now(),
  unique (reporter_id, reported_id, reason)
);

create table activities (
  id bigserial primary key,
  user_id uuid not null references profiles on delete cascade,
  type text not null check (type in ('added','watched_movie','started_show','watched_episodes','finished_show','followed')),
  title_id bigint references titles on delete cascade,
  episode_id bigint references episodes on delete set null,  -- renseigné si count = 1
  target_user_id uuid references profiles on delete cascade,
  count int not null default 1,
  activity_date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index activities_user_time on activities (user_id, updated_at desc);
create unique index activities_eps_day on activities (user_id, title_id, activity_date) where type = 'watched_episodes';

create table recent_profile_visits (
  user_id uuid not null references profiles on delete cascade,
  visited_id uuid not null references profiles on delete cascade,
  visited_at timestamptz not null default now(),
  primary key (user_id, visited_id)
);

-- Compteurs maintenus par trigger sur follows (insert / update status / delete), seulement pour status = 'accepted'.

alter table follows enable row level security;    create policy own on follows    using (follower_id = auth.uid() or followee_id = auth.uid());
alter table blocks enable row level security;     create policy own on blocks     using (blocker_id = auth.uid());
alter table reports enable row level security;    create policy own on reports    using (reporter_id = auth.uid());
alter table activities enable row level security; create policy own on activities using (user_id = auth.uid());
alter table recent_profile_visits enable row level security; create policy own on recent_profile_visits using (user_id = auth.uid());
```
La lecture des profils, listes et activités **des autres** passe **uniquement par le backend**, qui applique `docs/01` §3 et §5.

## 2. Écriture des activités (backend, dans les endpoints existants)
| Action existante | Activité |
|---|---|
| ajout d'un film en « à voir » | `added` |
| ajout d'une série ou d'un animé en suivi | `added` |
| film marqué vu | `watched_movie` (supprime un `added` du même jour pour le même titre) |
| 1er épisode coché d'une série | `started_show` |
| épisodes cochés | `watched_episodes` : **une seule ligne par (utilisateur, titre, jour)** ; `count` = nombre d'épisodes distincts cochés ce jour-là, `episode_id` = l'épisode si `count = 1`, sinon null, `updated_at = now()` |
| dernier épisode diffusé coché d'une série terminée | `finished_show` |
| abonnement accepté | `followed` (avec `target_user_id`) |
- **Décocher un film** ou **retirer un titre** supprime les activités de ce titre pour cet utilisateur. **Décocher des épisodes** décrémente `count` (supprime la ligne à 0).
- Se désabonner supprime l'activité `followed` correspondante.
- Pas d'activité pour un utilisateur en profil privé ? **Si** : elles sont écrites, mais seuls ses abonnés acceptés les lisent.
- Rétention : 180 jours (tâche planifiée de purge).

## 3. Endpoints (préfixe `/api/v1`, JWT Supabase)
| Méthode | Route | Corps / paramètres | Réponse / effet |
|---|---|---|---|
| GET | `/users/username-available?u=` | — | `{ available: bool, reason?: 'invalid'|'taken'|'reserved', suggestions: string[3] }` |
| GET | `/users/search?q=&cursor=` | q ≥ 2 caractères, sans le « @ » | `{ items: MemberLite[], nextCursor }`, tri de `docs/04` §4.6, comptes bloqués exclus |
| GET | `/users/{username}` | — | `UserProfile` (ci-dessous) ; `404` si inexistant ou si cet utilisateur m'a bloqué |
| GET | `/users/{username}/titles?type=movie|tv|anime&status=towatch|watched|in_progress|finished&cursor=` | — | `{ items: ProfileTitle[], nextCursor }` ; `403` si privé non suivi ou bloqué |
| GET | `/users/{username}/followers?q=&cursor=` · `/following?q=&cursor=` | — | `{ items: MemberLite[], nextCursor }`, plus récents en premier ; `403` si privé non suivi |
| POST | `/users/{username}/follow` | — | `{ status: 'accepted'|'pending' }` ; `403` si blocage, `429` si limite atteinte, idempotent |
| DELETE | `/users/{username}/follow` | — | `204` : se désabonner ou annuler une demande |
| DELETE | `/me/followers/{username}` | — | `204` : retirer un abonné |
| GET | `/me/follow-requests?cursor=` | — | `{ items: MemberLite[], nextCursor }` |
| POST | `/me/follow-requests/{username}/accept` · `/decline` | — | `204` |
| POST | `/me/follow-requests/accept-all` | — | `{ accepted: n }` |
| POST | `/users/{username}/block` · DELETE `/users/{username}/block` | — | `204` |
| GET | `/me/blocks` | — | `MemberLite[]` |
| POST | `/users/{username}/report` | `{ reason }` | `204` |
| GET | `/me/feed?cursor=&limit=30` | — | `{ items: Activity[], nextCursor }` |
| GET | `/titles/{type}/{tmdbId}/social` | — | `{ following: { user: MemberLite, status, detail?, date }[], saw: (MemberLite & { commonCount })[] }` |
| GET | `/me/recent-profiles` · POST `/me/recent-profiles/{username}` | — | 5 derniers profils visités |
| PUT | `/me/profile` | accepte en plus `username`, `displayName`, `isPrivate`, `avatarUrl` | `409 username_taken`, `422 username_invalid`, `429 username_change_too_soon { nextChangeAt }` |

### Types
```ts
type MemberLite = { username: string; displayName: string; avatarUrl?: string; isPrivate: boolean;
  followState: 'none'|'pending'|'following'|'blocked'; followsMe: boolean; commonCount: number };
type UserProfile = MemberLite & { followersCount: number; followingCount: number; canSeeLists: boolean; isMe: boolean };
type ProfileTitle = { title: TitleLite; status: 'towatch'|'watched'|'in_progress'|'finished';
  lastEpisode?: { season: number; number: number }; progressPct?: number; inMyList: boolean };
type Activity = { id: string; createdAt: string; actor: MemberLite;
  type: 'added'|'watched_movie'|'started_show'|'watched_episodes'|'finished_show'|'followed';
  title?: TitleLite; episode?: { id: number; season: number; number: number; name: string; stillPath?: string };
  count: number; target?: MemberLite; inMyList: boolean };
```
- `commonCount` est calculé côté serveur (`docs/01` §8), mis en cache 1 h par paire de comptes et invalidé quand l'un des deux change un statut.
- `Activity.episode.name` et `stillPath` sont **toujours** envoyés : c'est le client qui applique l'anti-spoiler, puisqu'il connaît mes épisodes vus.
- Statut renvoyé pour `following[].status` dans `/social` : film `watched` (avec `date`) ou `towatch` ; série `in_progress` (avec `detail = "S02 E05"`), `finished`, `abandoned`, `towatch`.

## 4. Règles serveur
- Suivre un profil public → `accepted`, notification « Nouvel abonné ». Profil privé → `pending`, notification « Demande d'abonnement ».
- Passage de privé à public → toutes les demandes `pending` deviennent `accepted` (une notification « Demande acceptée » par demandeur).
- Bloquer → supprime `follows` dans les deux sens, plus les demandes.
- Limite : 200 `POST /follow` réussis par jour et par utilisateur (compteur dans Redis ou dans une table, remis à zéro à minuit UTC).
- Changement de pseudo : refusé si `username_changed_at > now() − 30 jours` ; insère l'ancien pseudo dans `username_history` avec `released_at = now() + 30 jours` ; `username-available` considère comme pris un pseudo présent dans `username_history` et pas encore libéré.
- Suppression du compte : cascade sur toutes les tables sociales, et les compteurs des autres comptes sont recalculés.

## 5. Notifications (ajout au job d'envoi existant)
- Évènements `new_follower`, `follow_request`, `follow_accepted` mis en file au moment de l'action ; envoi par le job existant (toutes les 15 min) ou immédiatement si le job le permet.
- Regroupement : si plus de 3 `new_follower` pour le même destinataire en moins de 60 minutes, une seule notification groupée.
- Dédoublonnage via `notifications_log` : une notification `new_follower` par paire et par 24 h.
- Respect des interrupteurs `new_follower` / `follow_requests` de `notification_prefs`.
