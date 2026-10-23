# MAPPING — spec sociale ↔ code de Zabava

Correspondance demandée par `CLAUDE.original.md` (« Avant d'écrire du code », point 2). Écrite le 2026-10-23 à partir de `main` (94fb46c).

## 1. Provenance des fichiers
- `docs/`, `etapes/`, `captures/`, `README.md`, `reference/social.js`, `reference/spec-social.pdf` : dernière version du handoff (avec les 15 captures).
- `reference/App Zabava.dc.html`, `MemberRow.dc.html`, `zabava.js` : prototype navigable de la version précédente du handoff. `zabava.js` = `specs/reference/app.js` + les branchements de `social.js`. Ses autres dépendances (`data.js`, `styles.css`, `support.js`, `Poster.dc.html`) sont identiques à celles de `specs/reference/` et n'ont pas été recopiées : pour l'ouvrir, servir un dossier temporaire qui réunit les deux.
- `CLAUDE.original.md` : bloc de consignes du handoff, fusionné dans le `CLAUDE.md` du dépôt.
- Les chemins cités par ces fichiers (`docs/…`, `etapes/…`, `reference/…`, `captures/…`) se lisent sous `specs/social/`.

## 2. Rôles visuels (`docs/03` §0) → tokens (`mobile/src/theme/tokens.ts`)
Valeurs relevées dans les styles inline du prototype social (`App Zabava.dc.html`).

| Rôle | Token | Remarque |
|---|---|---|
| `accent` | `colors.accent` | violet Nocturne ; le « jaune #FFD000 » du PDF est périmé |
| `onAccent` | `colors.bg` | comme la coche de `CheckButton` |
| `bg` | `colors.bg` | |
| `surface` | `colors.surface` | |
| `surface2` | `colors.neutral800` | chip « titres en commun », cercle du verrou, avatar sans photo |
| `textPrimary` | `colors.text` (`neutral100` pour les chips et « Déjà pris ») | |
| `textSecondary` | `colors.neutral400` | @pseudo, libellés, statuts |
| `textTertiary` | `colors.neutral500` | heures, aides |
| `divider` | `colors.divider` | |
| `danger` | — | absent : style neutre (README, décision 1) |
| « Disponible » | `colors.accent300` | variante lisible de l'accent |
| Mon avatar sans photo | `colors.accent800`, initiale `accent100` | comme l'avatar actuel du Profil |

Graisses : « semibold » et « bold » de la spec = **500** (`fonts.medium`), règle 4 du `CLAUDE.md`. Boutons primaires : **contour accent, jamais remplis** (règle 5) — c'est aussi ce que montrent les captures.

## 3. Composants existants à réutiliser (`mobile/src/components`)
| Besoin social | Composant |
|---|---|
| Boutons primaire / secondaire / ghost / icône | `Button` (hitSlop automatique sous 44) |
| Onglets soulignés Films · Séries · Animés, Abonnés · Abonnements | `UnderlineTabs` |
| À voir \| Vus, En cours \| Terminées \| À voir | `Segmented` |
| Tag « Te suit » | `Tag` (variante neutre) |
| Chips de propositions | `Chip` |
| Bottom sheets (Inviter, Tes abonnements) | `BottomSheet` |
| Menus « … », motifs de signalement | `ActionSheet` (`openActionSheet`) |
| Dialogue de blocage, modifications non enregistrées | `Dialog` (`openDialog`) |
| Toasts, « Annuler » | `Toast` (`showToast(message, undo)`) |
| Interrupteurs | `Switch` |
| Champs (filtre, nom affiché) | `TextField` |
| Squelettes, vide, erreur, hors ligne | `Skeleton`, `EmptyState`, `LoadError`, `OfflineBanner` |
| Affiches avec +/coche | `features/catalog/CatalogPoster` + `useLibraryMembership` + `toggleInList` (`api/libraryActions`) |
| Carrousels | `HorizontalCarousel` |
| Titres de section | `SectionHeader` |
| Barre d'onglet | `ScreenHeader` |
| Lignes de réglages | `features/profile/SettingsGroup` (`SettingsGroup`, `SettingsRow`) |

## 4. Structure
- Routes : `mobile/app/` (Expo Router), Stack racine dans `app/_layout.tsx` (`pushOptions` pour les écrans poussés), onglets dans `app/(tabs)/`, onboarding dans `app/onboarding/` (étapes `ONBOARDING_STEPS` de `domain/onboarding.ts`, garde dans `features/onboarding/AuthGate.tsx`).
- Store d'interface : `store/ui.ts` (zustand, non persisté).
- Client HTTP : `api/http.ts` (`api<T>(path, { method, body, query })`, `ApiError.status`), types générés `api/types.ts` (`npm run api:types`).
- Requêtes : TanStack Query, `api/queryClient.ts` (persistance sélective `shouldPersistQuery`).
- File de mutations hors ligne : `api/mutationQueue.ts` — **pas utilisée par le social** (actions refusées hors ligne).
- Backend : `backend/src/main/java/com/zabava/api/…`, JDBC (`JdbcClient`), erreurs `common/ApiException`, utilisateur courant `auth/CurrentUser`, tâches planifiées `jobs/ScheduledJobs`.

## 5. Anti-spoiler et liste de l'utilisateur
- Anti-spoiler : `profiles.spoiler_protection`, lu côté client (`profile.spoilerProtection`).
- Statuts en base (`user_titles.status`) : films `towatch` / `watched` ; séries `following` / `abandoned`. Épisodes vus : `user_episodes`.
- Sections des séries calculées **côté client** (`domain/series.ts › seriesSection`) : `watch`, `stale`, `uptodate`, `done`, `notstarted`, `abandoned`. Le serveur doit en porter l'équivalent pour les listes des autres (`in_progress` / `finished` / `towatch`), `finished_show` et « Ils l'ont vu » : épisodes diffusés hors saison 0, série `ended`.

## 6. Écarts assumés avec la spec sociale
- Android seulement : pas d'`apple-app-site-association`, « Photo de mon compte Google » uniquement.
- Domaine des liens : `151-145-50-138.sslip.io` (`EXPO_PUBLIC_INVITE_DOMAIN`), page de repli et `assetlinks.json` servis par le serveur.
- Pas de stores : la page de repli n'a pas de liens App Store / Google Play.
- Signalements : enregistrés dans `reports`, sans courriel (aucun service d'envoi).
- Limite de 200 abonnements par jour : compteur en base (pas de Redis).
- Regroupement des épisodes « par jour » : jour calendaire dans le fuseau de l'utilisateur (`profiles.timezone`), pas le jour UTC.
