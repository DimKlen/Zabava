# Handoff : Suivi — app mobile de suivi films, séries et animés

## Vue d'ensemble
**Suivi** (nom de travail) est une application mobile iOS et Android pour suivre ses films, séries et animés : ce qu'on veut voir, ce qu'on a vu, ce qui sort bientôt. Elle reprend le fonctionnement de TV Show Time en version simplifiée, **sans statistiques et sans partie sociale**.

Ce dossier contient tout ce qu'il faut pour construire l'app avec Claude Code : la spécification produit d'origine (`spec.pdf`), le prototype haute fidélité validé, et une spécification technique écrite à partir des deux.

## À propos des fichiers de design
Les fichiers de `reference/` sont des **références de design faites en HTML**. Ce sont des prototypes qui montrent l'apparence et le comportement attendus, pas du code de production à copier. Le travail consiste à **recréer ces écrans en React Native (Expo)**, la stack imposée par la spec, avec les bibliothèques et les conventions de cette stack.

Pour ouvrir le prototype : servez le dossier `reference/` avec un serveur statique (`npx serve reference`), puis ouvrez `App Suivi.dc.html`. Tous les écrans sont navigables.

## Fidélité
**Haute fidélité.** Couleurs, typographie, espacements, rayons, textes, animations et interactions sont définitifs. L'application doit reproduire le prototype au pixel près, à 390 × 844 pt (iPhone 14/15). Sur les autres tailles d'écran, la mise en page s'étire en largeur ; les grilles gardent 3 colonnes.

Seule différence voulue : le prototype affiche des **affiches de remplacement** (dégradé + titre), alors que l'application affiche les vraies affiches TMDB. Le remplacement ne sert que quand l'affiche manque, et il doit alors être identique au prototype (voir `docs/03-composants.md` › Poster).

## Décision de design validée
La spec PDF (§2) proposait un accent jaune `#FFD000` sur fond `#0E0E10`. **Le prototype validé utilise le design system Nocturne** : fond `#161826`, accent violet `#9184d9`, boutons principaux en contour. C'est la version de référence. Le tableau des correspondances est dans `docs/02-design-tokens.md`. Tout le reste de la spec PDF s'applique tel quel.

## Ordre de lecture

| Fichier | Contenu |
|---|---|
| `CLAUDE.original.md` | Consignes d'origine pour Claude Code (fusionnées dans `/CLAUDE.md` à la racine) |
| `docs/01-produit-et-regles.md` | Périmètre, principes, règles métier, notifications (spec PDF + prototype) |
| `docs/02-design-tokens.md` | Couleurs, typo, espacements, rayons, ombres, animations, icônes |
| `docs/03-composants.md` | Chaque composant réutilisable, avec ses mesures exactes et ses états |
| `docs/04-navigation.md` | Arborescence Expo Router, parcours, matrice des liens entre écrans |
| `docs/05-ecrans-auth-onboarding.md` | Connexion, onboarding, permission notifications |
| `docs/06-ecran-watchlist.md` | Ma liste : Films, Séries, Animés |
| `docs/07-fiches.md` | Fiche film, fiche série/animé, fiche épisode, fiche personne, liste par genre |
| `docs/08-recherche-decouvrir.md` | Recherche, recherche avancée, Découvrir |
| `docs/09-a-venir-profil.md` | À venir, Profil et réglages |
| `docs/10-etat-et-donnees-client.md` | État client, cache, hors ligne, mutations optimistes, textes des toasts |
| `docs/11-backend-api.md` | Spring Boot, Supabase, schéma SQL, endpoints, tâches planifiées, sources de données |
| `etapes/` | Plan de réalisation pas à pas (9 étapes avec critères d'acceptation) |
| `reference/` | Prototype HTML + spec PDF d'origine |
| `captures/` | 23 captures du prototype, une par écran ou état (voir ci-dessous) |

## Stack (imposée par la spec)
- **Mobile** : Expo SDK 52+ (React Native, TypeScript strict), Expo Router, TanStack Query (+ persistance pour le hors ligne), Zustand pour l'état d'interface, Expo Notifications, Expo Image, Expo Haptics, `react-native-reanimated` 3, `react-native-gesture-handler`, `phosphor-react-native`, `@expo-google-fonts/inter`, `expo-linear-gradient`, `expo-blur`.
- **Backend** : Spring Boot 3 (Java 21), validation du JWT Supabase, Spring Scheduler.
- **Base et auth** : Supabase (Postgres + Auth OAuth Google/Apple), Row Level Security.
- **Sources** : TMDB, JustWatch (via TMDB watch/providers), OMDb, TVmaze. Envoi des notifications avec Expo Push.

## Fichiers de référence (`reference/`)
- `App Suivi.dc.html` : le prototype complet (template + logique).
- `Poster.dc.html` : le composant affiche.
- `app.js` : **toute la logique du prototype** (calcul des sections, prochain épisode, badges, filtres, recherche avancée, À venir). C'est la source de vérité pour les algorithmes.
- `data.js` : les données fictives (titres, casting, progression initiale).
- `styles.css` : les tokens Nocturne et les classes de composants (`.btn`, `.seg`, `.dialog`, `.tag`, `.input`…).
- `support.js` : le moteur d'exécution du prototype (aucune utilité pour l'app).
- `spec.pdf` : la spécification produit d'origine.

## Captures (`captures/`)
Prises sur le prototype à 390 × 844, dans le cadre du téléphone. Elles servent à comparer visuellement, pas à mesurer : les valeurs exactes sont dans `docs/`. Les affiches y sont des dessins de remplacement (dans l'app, ce seront les vraies affiches TMDB).

01 connexion · 02–04 onboarding (région, plateformes, titres) · 05 notifications · 06 Ma liste Films · 07 action sheet de tri · 08 Séries · 09 Animés · 10 fiche film · 11 fiche série, onglet Épisodes · 12 fiche série, onglet Infos · 13 fiche épisode · 14 dialogue des épisodes précédents · 15 fiche personne · 16 recherche sans saisie · 17 résultats « zen » · 18 recherche avancée · 19 Découvrir · 20 liste par genre · 21 À venir · 22 Profil · 23 sheet Mes plateformes.

## Assets
- **Police** : Inter 400/500/600/700 (Google Fonts → `@expo-google-fonts/inter`).
- **Icônes** : Phosphor (graisses regular et fill) → `phosphor-react-native`. La liste exacte des icônes est dans `docs/02-design-tokens.md`.
- **Images** : affiches, backdrops, images d'épisodes et photos de personnes viennent de TMDB (`https://image.tmdb.org/t/p/{taille}{path}`). Logos de plateformes : `logo_path` de l'endpoint TMDB watch/providers.
- **Logos d'attribution** : TMDB et JustWatch sont obligatoires dans Profil › À propos. Le prototype les montre en tags texte ; l'app doit utiliser les logos officiels, à la même place et à la même taille (hauteur 22 pt).
