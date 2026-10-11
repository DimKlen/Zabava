# CLAUDE.md — Suivi (app mobile)

Copie ce fichier à la racine du dépôt. Il s'applique à toutes les sessions Claude Code sur ce projet.

## Ce qu'on construit
Une app Expo (React Native + TypeScript) de suivi de films, séries et animés, plus un backend Spring Boot et Supabase. La spec complète est dans `docs/`, le plan de travail dans `etapes/`. Réalise les étapes **dans l'ordre**, une à la fois, et vérifie chaque critère d'acceptation avant de passer à la suivante.

## Règles absolues
1. **Fidélité visuelle** : l'UI doit correspondre au prototype `reference/App Suivi.dc.html`. Prends toutes les valeurs (couleurs, tailles, espacements, rayons, durées) dans `docs/02-design-tokens.md` et `docs/03-composants.md`. N'invente aucune valeur. Si une valeur manque, lis le style inline du prototype.
2. **Textes** : reprends les textes de l'interface **mot pour mot** (français, fr-CA, tutoiement). Ils sont tous dans `docs/05` à `docs/09` et `docs/10` (toasts).
3. **Tokens** : toutes les couleurs viennent de `src/theme/tokens.ts`. Aucun hex en dur dans les composants. Pas de noir ni de blanc purs (`#000`/`#fff`), sauf `rgba(0,0,0,x)` pour les ombres.
4. **Graisse des titres** : 500, jamais plus (la hiérarchie vient de la taille). Seules exceptions : l'heure de la barre d'état système, le badge IMDb (700), les abréviations des pastilles de plateformes (600) et l'initiale décorative des affiches (600).
5. **Boutons principaux** : contour accent 1 pt sur fond transparent, **jamais remplis**. Seuls la coche « vu », le bouton « + » une fois coché, le bouton « Saison vue » et les interrupteurs actifs prennent un fond accent.
6. **Zones tactiles** : 44 × 44 pt minimum, même quand le visuel est plus petit (coche 32 pt dans une zone de 44 à 48 pt, etc.).
7. **Logique métier** : `reference/app.js` fait foi pour les algorithmes (sections de la watchlist, prochain épisode, badges, filtres). Porte-les dans `src/domain/` en TypeScript pur, avec des tests unitaires.
8. **Hors ligne** : cocher un épisode, marquer un film comme vu, ajouter ou retirer un titre doivent marcher sans réseau (file de mutations persistée) et afficher le résultat tout de suite (mise à jour optimiste).
9. **Annulation** : toute action qui modifie la liste ou le suivi affiche un toast de 5 s avec « Annuler », sauf exceptions listées dans `docs/10`.
10. **Pas de fonctionnalités hors périmètre** : ni statistiques, ni social, ni lecture vidéo dans l'app.

## Arborescence cible
```
mobile/
  app/                 # routes Expo Router (voir docs/04-navigation.md)
  src/
    theme/             # tokens.ts, typography.ts, gradients.ts
    components/        # composants de docs/03
    features/          # watchlist/, title/, search/, discover/, upcoming/, profile/, onboarding/
    domain/            # logique pure + tests (sections, nextEpisode, badges, filters…)
    api/               # client HTTP, hooks TanStack Query, file de mutations
    store/             # zustand (UI : toast, sheets, swipe ouvert…)
    lib/               # dates (fr-CA), haptics, deep links
backend/               # Spring Boot (voir docs/11-backend-api.md)
supabase/migrations/   # SQL
```

## Commandes
- Mobile : `cd mobile && npx expo start` · tests : `npm test` (Jest + @testing-library/react-native) · types : `npx tsc --noEmit` · lint : `npx eslint .`
- Backend : `cd backend && ./gradlew bootRun` · tests : `./gradlew test`
- Base : `supabase start` puis `supabase db reset`

## Conventions
- Composants fonctionnels et hooks. Styles avec `StyleSheet.create`. Les valeurs dynamiques (progression, translation du swipe) passent par Reanimated.
- Dates stockées en UTC, affichées dans le fuseau du téléphone avec `Intl.DateTimeFormat('fr-CA', …)`. Les formats sont dans `docs/10`.
- Un écran = un fichier de route très mince, qui délègue à `src/features/<x>/<X>Screen.tsx`.
- Chaque étape se termine par : `tsc` sans erreur, tests verts, et une vérification visuelle comparée au prototype.
