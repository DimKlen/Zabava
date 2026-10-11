# Étape 6 — Suivi des séries et animés

**Référence** : `docs/01` §3–4, `docs/06` (Séries/Animés), `docs/07` §7.1 (série) et §7.2.

## Tâches
1. `src/domain/series.ts` : `seriesInfo`, `seriesSection`, `previousUnwatched`, avec les tests de tous les cas (dont la saison 0 et les épisodes non diffusés).
2. Onglets Séries et Animés : 6 sections, ordre, tris, repli (Terminées et Abandonnées repliées par défaut), cartes avec coche, animation `cardIn` et swipe ; carrousel « Commencer » ; lignes compactes ; vide.
3. Fiche série : statut, prochain épisode, Suivre/Suivie/Abandonnée, ActionSheet « … », onglets Épisodes/Infos, saisons, en-tête de saison, « Tout marquer comme vu » / « Saison vue », lignes d'épisodes, dialogue des épisodes précédents, décochage.
4. EpisodeSheet.
5. Mutations d'épisodes en lot (`POST` / `DELETE /me/episodes/watched`).

## Critères d'acceptation
- Cocher la carte de *The Bear* S04 E03 affiche aussitôt S04 E04, la barre avance, le toast propose Annuler.
- Cocher E08 alors que E05 à E07 ne sont pas vus ouvre « Marquer aussi les 3 épisodes précédents ? ».
- Une série dont tout est vu et qui est encore en production passe dans « À jour » avec le bon libellé.
- Swipe → Abandonner : la série passe dans Abandonnées, Annuler la remet à sa place.
