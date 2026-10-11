# Backend Zabava

API Spring Boot (Java 21) de l'app Zabava. Spécification : `specs/docs/11-backend-api.md`.

- Routes sous `/api/v1`, JSON camelCase, erreurs `{"error": {"code", "message"}}`.
- Chaque requête porte le JWT Supabase de l'utilisateur (`Authorization: Bearer …`).
- Documentation OpenAPI : `/api/docs` (JSON) et `/api/docs/ui` (Swagger UI).

## Lancer en local

Prérequis : Docker, JDK 21 (`JAVA_HOME`), le CLI Supabase.

```bash
# À la racine du dépôt : Postgres, Auth et Studio locaux, puis la migration
supabase start
supabase db reset

# Backend (port 8080)
cd backend
SUPABASE_JWT_SECRET=<JWT secret affiché par `supabase status`> \
TMDB_API_KEY=<jeton TMDB v4> OMDB_API_KEY=<clé OMDb> \
./gradlew bootRun
```

Remplir les plateformes d'abonnement des 5 régions (une fois, avec la clé TMDB) :

```bash
./gradlew bootRun --args='--zabava.seed-providers=true'
```

## Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `DATABASE_URL` | URL **JDBC** Postgres | `jdbc:postgresql://127.0.0.1:54322/postgres` (Supabase local) |
| `DATABASE_USER` / `DATABASE_PASSWORD` | Rôle de service Postgres | `postgres` / `postgres` |
| `SUPABASE_URL` | URL du projet (Admin API pour `DELETE /me`) | `http://127.0.0.1:54321` |
| `SUPABASE_JWT_SECRET` | Secret HS256 des JWT | — |
| `SUPABASE_JWKS_URI` | JWKS des JWT asymétriques, prioritaire sur le secret | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé `service_role` | — |
| `TMDB_API_KEY` | Jeton « API Read Access Token » (v4) ; une clé v3 marche aussi | — |
| `OMDB_API_KEY` | Clé OMDb (notes IMDb et Rotten Tomatoes) | — |
| `EXPO_ACCESS_TOKEN` | Envoi des notifications (étape 8) | — |
| `PORT` | Port HTTP | `8080` |

Sans `OMDB_API_KEY`, les fiches n'ont pas de notes. Sans `TMDB_API_KEY`, le catalogue renvoie 502.

## Tests

```bash
./gradlew test
```

Les tests d'intégration démarrent un Postgres 17 (Testcontainers, Docker requis), y appliquent
`supabase/migrations/0001_init.sql` sur une imitation du schéma `auth` de Supabase, et simulent
TMDB, OMDb, TVmaze et l'Admin API Supabase avec WireMock.

Ils exportent aussi le contrat OpenAPI dans `build/openapi.json`. Pour régénérer les types de l'app :

```bash
cd ../mobile && npm run api:types
```

## Choix techniques

- **Spring Boot 4.1** : la spec demande Spring Boot 3, mais la 3.5 n'est plus maintenue gratuitement.
- **RestClient** (et non WebClient) : l'API est servlet, les appels sortants sont synchrones.
- **Caches** Caffeine en mémoire : TMDB 24 h (recherche 10 min), OMDb 7 jours, TVmaze 24 h.
  Les titres consultés sont aussi gardés en base.
- **Animés** : seules les séries peuvent être classées animées (genre Animation et Japon ou mot-clé
  « anime ») ; un film d'animation japonais reste dans Films.
- **Arrivées en streaming** : les offres présentes quand un titre entre en base ont
  `first_seen_at = 1970-01-01` (« connues depuis toujours ») ; seules les offres apparues ensuite
  sont des arrivées (À venir, notifications).
- **Recherche avancée avec acteurs** : TMDB ne filtre pas les séries par acteur ; on croise les
  filmographies. Les filtres plateforme et durée ne s'appliquent pas dans ce cas.
- **Genres sans équivalent série** (Horreur, Thriller) : « Mystère » (9648) côté séries.
- **Note minimale** : filtre sur la note TMDB (`vote_average`), Découvrir n'ayant pas les notes IMDb.
