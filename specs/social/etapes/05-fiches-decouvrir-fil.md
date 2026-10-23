# Étape 5 — Blocs sociaux des fiches, carrousel Découvrir, fil d'activité

Référence : `docs/04` §4.9 à 4.11, `docs/07` §1.

## Tâches
1. `domain/social/feed.ts`, `followingSummary.ts`, `common.ts` et leurs tests.
2. FollowingCard, FollowingSheet et le carrousel de SawCard sous « Où regarder » (onglet Infos pour les séries et animés).
3. ActivityCard et carrousel en haut de Découvrir.
4. Écran Fil : groupes par jour, pagination par 30, tirer pour rafraîchir, état vide, cache hors ligne.
5. Anti-spoiler appliqué aux activités d'épisodes.

## Critères d'acceptation
- Une fiche vue par moins de 3 profils publics non suivis n'affiche pas « Ils l'ont vu ».
- Suivre depuis « Ils l'ont vu » fait passer la personne dans « Tes abonnements ».
- Anti-spoiler actif : « Léa a vu S04 E05 de The Bear » sans titre d'épisode ni vignette, si je n'ai pas vu cet épisode.
- Le carrousel de Découvrir est masqué quand le fil est vide.
