# Étape 3 — Base de données et API

**Objectif** : Supabase et Spring Boot opérationnels, avec les endpoints de catalogue et de liste.

## Tâches
1. `supabase/migrations/0001_init.sql` = le schéma de `docs/11-backend-api.md` §2 (avec `profiles.timezone`). Seed des `providers` pour CA, FR, BE, CH, US depuis TMDB `/watch/providers/movie` et `/tv`.
2. Configurer Supabase Auth : Apple et Google.
3. Spring Boot 3 (Gradle, Java 21) : modules `auth` (JWT), `tmdb` (client WebClient + cache), `omdb`, `tvmaze`, `catalog` (titles, seasons, episodes, people, search, discover), `me` (profile, providers, watchlist, titles, episodes, upcoming, push-token, delete).
4. Mise en cache des titres consultés dans `titles`, `seasons`, `episodes`, `release_dates`, `title_availability` (durées de `docs/11` §1).
5. Classement `is_anime` (`docs/01` §2) et filtrage `type=anime` partout.
6. OpenAPI (springdoc) servi sur `/api/docs`. Générer les types TS du client dans `mobile/src/api/types.ts`.

## Critères d'acceptation
- Tests d'intégration (Testcontainers Postgres) pour chaque endpoint de `docs/11` §3.
- Avec un JWT valide, `GET /me/watchlist?type=anime` ne renvoie que des animés, et `type=tv` n'en renvoie aucun.
- Les requêtes sans JWT renvoient 401 ; un utilisateur ne peut jamais lire les données d'un autre.
