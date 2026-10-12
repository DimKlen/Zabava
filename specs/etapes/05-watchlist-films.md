# Étape 5 — Ma liste › Films, fiche film, ajout rapide

**Référence** : `docs/06` (Films), `docs/07` §7.1 (partie film), `docs/10`.

## Tâches
1. `src/domain/availability.ts`, `badge.ts`, `format.ts`, `gradient.ts`, `watchlist.ts`, avec leurs tests.
2. Requêtes et mutations TanStack (`docs/10` §3–4) : ajout, retrait, vu / non vu, en optimiste avec instantané pour Annuler.
3. Écran Ma liste, onglet Films : segment, tri (ActionSheet), chips de filtre, grille, ligne d'aide, appui long, squelettes, 3 états vides.
4. Fiche film complète : en-tête, notes, actions, bandeau de statut, où regarder, synopsis repliable, bande-annonce, casting, équipe, infos, saga, similaires, cloche.
5. Ajout et retrait rapides depuis toute affiche, avec toasts.

## Critères d'acceptation
- Les 4 tris et les 4 filtres donnent les mêmes résultats que le prototype avec les mêmes données (mocker `reference/data.js` dans un test).
- Le badge suit la priorité des plateformes de `docs/01` §5.
- Ajouter depuis une affiche puis toucher « Annuler » remet l'état d'avant, à l'écran et en base.
- Fiche : un film sans note n'a pas de chip ; un film sans plateforme affiche « Disponibilité inconnue pour ta région. »
