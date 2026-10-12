# CLAUDE.md — Zabava (app mobile)

## Ce qu'on construit
**Zabava** est une app mobile iOS et Android pour suivre ses films, séries et animés : ce qu'on veut voir, ce qu'on a vu, ce qui sort bientôt. C'est un TV Show Time simplifié, **sans statistiques ni partie sociale**.

Stack : app Expo (React Native + TypeScript), backend Spring Boot 3 (Java 21), Supabase (Postgres + Auth).

## Où trouver la spec
Tout est dans `specs/` :
- `specs/spec-readme.md` : vue d'ensemble et ordre de lecture.
- `specs/docs/` : la spec complète (`01` produit et règles … `11` backend).
- `specs/etapes/` : le plan de travail en 9 étapes, avec leurs critères d'acceptation.
- `specs/reference/` : le prototype HTML validé (`App Suivi.dc.html`), sa logique (`app.js`), les données fictives (`data.js`), les styles (`styles.css`) et la spec PDF d'origine.
- `specs/captures/` : 23 captures du prototype, pour la comparaison visuelle.

Réalise les étapes **dans l'ordre**, une à la fois, et vérifie chaque critère d'acceptation avant de passer à la suivante.

### Correspondance des chemins
Les fichiers de `specs/` citent `docs/…`, `reference/…` et `etapes/…` comme s'ils étaient à la racine. Lis-les toujours sous `specs/` : `docs/04-navigation.md` → `specs/docs/04-navigation.md`, `reference/app.js` → `specs/reference/app.js`. Ne déplace pas ces dossiers. La tâche de l'étape 1 « copier `CLAUDE.md`, `docs/` et `reference/` à la racine » est déjà réglée par ce fichier.

### Nom de l'app : Zabava (et non « Suivi »)
« Suivi » était le nom de travail de la spec. Partout où la spec écrit « Suivi », utilise **Zabava** :
- `app.config.ts` : `name: "Zabava"`, `slug: "zabava"`, `scheme: "zabava"`.
- Liens profonds : `zabava://…` au lieu de `suivi://…` (`specs/docs/04-navigation.md` §4). Liens universels : domaine à définir.
- Écran de connexion : le texte à côté du logo est « Zabava ».
- Variable d'environnement : `EXPO_PUBLIC_DEEPLINK_SCHEME=zabava`.
- Identifiants techniques (package Java, bundle id, nom du projet Gradle) : `zabava`.
Le nom du fichier de référence `App Suivi.dc.html` reste tel quel.

## Règles absolues
1. **Fidélité visuelle** : l'UI doit correspondre au prototype `specs/reference/App Suivi.dc.html`. Prends toutes les valeurs (couleurs, tailles, espacements, rayons, durées) dans `specs/docs/02-design-tokens.md` et `specs/docs/03-composants.md`. N'invente aucune valeur. Si une valeur manque, lis le style inline du prototype.
2. **Textes** : reprends les textes de l'interface **mot pour mot** (français, fr-CA, tutoiement). Ils sont tous dans `specs/docs/05` à `09` et `specs/docs/10` (toasts). Seule exception : « Suivi » devient « Zabava ».
3. **Tokens** : toutes les couleurs viennent de `src/theme/tokens.ts`. Aucun hex en dur dans les composants. Pas de noir ni de blanc purs (`#000`/`#fff`), sauf `rgba(0,0,0,x)` pour les ombres.
4. **Graisse des titres** : 500, jamais plus (la hiérarchie vient de la taille). Seules exceptions : l'heure de la barre d'état système, le badge IMDb (700), les abréviations des pastilles de plateformes (600) et l'initiale décorative des affiches (600).
5. **Boutons principaux** : contour accent 1 pt sur fond transparent, **jamais remplis**. Seuls la coche « vu », le bouton « + » une fois coché, le bouton « Saison vue » et les interrupteurs actifs prennent un fond accent.
6. **Zones tactiles** : 44 × 44 pt minimum, même quand le visuel est plus petit (coche 32 pt dans une zone de 44 à 48 pt, etc.).
7. **Logique métier** : `specs/reference/app.js` fait foi pour les algorithmes (sections de la watchlist, prochain épisode, badges, filtres). Porte-les dans `src/domain/` en TypeScript pur, avec des tests unitaires.
8. **Hors ligne** : cocher un épisode, marquer un film comme vu, ajouter ou retirer un titre doivent marcher sans réseau (file de mutations persistée) et afficher le résultat tout de suite (mise à jour optimiste).
9. **Annulation** : toute action qui modifie la liste ou le suivi affiche un toast de 5 s avec « Annuler », sauf exceptions listées dans `specs/docs/10`.
10. **Pas de fonctionnalités hors périmètre** : ni statistiques, ni social, ni lecture vidéo dans l'app.

## Arborescence cible
```
mobile/
  app/                 # routes Expo Router (voir specs/docs/04-navigation.md)
  src/
    theme/             # tokens.ts, typography.ts, gradients.ts
    components/        # composants de specs/docs/03
    features/          # watchlist/, title/, search/, discover/, upcoming/, profile/, onboarding/
    domain/            # logique pure + tests (sections, nextEpisode, badges, filters…)
    api/               # client HTTP, hooks TanStack Query, file de mutations
    store/             # zustand (UI : toast, sheets, swipe ouvert…)
    lib/               # dates (fr-CA), haptics, deep links
backend/               # Spring Boot (voir specs/docs/11-backend-api.md)
supabase/migrations/   # SQL
specs/                 # spécification (lecture seule)
```

## Commandes
- Mobile : `cd mobile && npx expo start` · tests : `npm test` (Jest + @testing-library/react-native) · types : `npx tsc --noEmit` · lint : `npx eslint .`
- Backend : `cd backend && ./gradlew bootRun` · tests : `./gradlew test`
- Base : `supabase start` puis `supabase db reset`
- CI GitHub (`.github/workflows/ci.yml`, à chaque PR et push sur `main`) : mobile (types, lint, tests, bundle Android et iOS), backend (`./gradlew build`, tests Testcontainers compris), et contrôle que `mobile/src/api/types.ts` est régénéré après un changement de l'API.

## Environnement (Windows)
- Le backend demande Java 21. Le `java` par défaut de la machine est en version 25 : pointe `JAVA_HOME` vers `C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot` pour Gradle.
- Docker est requis pour `supabase start` et pour Testcontainers.

### Projet Supabase hébergé (développement)
- Projet `yavjdvphnsnpgchfjpah` (https://yavjdvphnsnpgchfjpah.supabase.co), relié par `supabase link`. Pooler : `aws-1-ca-central-1.pooler.supabase.com:5432`, utilisateur `postgres.yavjdvphnsnpgchfjpah`.
- C'est la base de **développement** (pas de production, pas de vraies données) : tu es autorisé à y lancer `supabase db push`, `supabase migration …` et `supabase link` sans demander, et à régler les variables d'environnement du backend (`setx`).
- Redirect URLs autorisées : `zabava://**,exp://**`. Supabase **refuse toute adresse de retour vers une IP privée** (`exp://192.168.…`, `10.0.2.2`) et renvoie alors vers la Site URL (`localhost:3000`). Pour tester la connexion dans Expo Go : `npx expo start --tunnel` (hôte `*.exp.direct`, accepté), ou un build de développement (`zabava://`).
- Les secrets restent dans les variables d'environnement utilisateur Windows, saisies par moi : `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `DATABASE_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, `TMDB_API_KEY`. Tu peux les charger dans une commande (`[Environment]::GetEnvironmentVariable(…, 'User')`), jamais les afficher, les copier dans un fichier ou les commiter.

## Versions réelles (écarts avec la spec)
- **Expo SDK 57** (React Native 0.86, React 19.2) : la spec dit « SDK 52+ ». Installe toujours avec `npx expo install`, jamais `npm install <pkg>` directement.
- **Reanimated 4** (avec `react-native-worklets`) au lieu de Reanimated 3 : l'API `useSharedValue` / `withTiming` / `Easing` décrite dans la spec reste valable.
- **TypeScript 6** : les types globaux ne sont plus chargés automatiquement. `tsconfig.json` déclare `"types": ["jest"]` ; un test qui utilise des API Node ajoute `/// <reference types="node" />`.
- Routes Expo Router dans `mobile/app/` (et non `src/app/`, malgré `mobile/AGENTS.md`) : c'est l'arborescence de la spec.
- Dans le Stack racine, `index` doit rester le premier `Stack.Screen` déclaré : sur natif, le premier écran déclaré sert d'écran initial.
- Android est toujours edge-to-edge. Dans Expo Go, la barre d'état reste noire ; elle est transparente dans un build natif.
- **Phosphor v3** : importe les icônes avec le suffixe `Icon` (`CheckIcon`, `CaretLeftIcon`…). Les noms sans suffixe de `specs/docs/02` §8 sont dépréciés, et certains (`Circle`) n'existent plus.
- **Reanimated 4 + React Compiler** : lis et écris les valeurs animées avec `.get()` / `.set()`, jamais `.value =` (règle ESLint `react-hooks/immutability`). Toute fonction appelée depuis un geste ou un worklet doit porter la directive `'worklet'` (sinon plantage natif « Tried to synchronously call a Remote Function »). Rappel vers le JS : `scheduleOnRN` de `react-native-worklets`.
- Pas de lecture de `ref.current` ni de `setState` synchrone dans un effet pendant le rendu (règles `react-hooks/refs` et `set-state-in-effect`) : ajuste l'état pendant le rendu (`prevX` / `setPrevX`).
- **Testing Library v14** : `render`, `fireEvent`, `act` et `rerender` sont asynchrones (`await`). Les textes masqués aux lecteurs d'écran demandent `{ includeHiddenElements: true }`.
- Surcouches (ActionSheet, Dialog) : l'action d'une option s'exécute juste après `close()`, sans attendre la fin de l'animation de sortie, qui peut être interrompue.
- Écran de démonstration des composants : `/dev/kitchen-sink` (développement seulement), avec les identifiants de `specs/reference/data.js` pour retrouver les mêmes dégradés que le prototype.

### Backend
- **Spring Boot 4.1** (la spec dit 3, qui n'est plus maintenue gratuitement). Starters découpés par module : `spring-boot-starter-webmvc`, `-restclient`, `-security-oauth2-resource-server`… Appels sortants avec `RestClient`, pas `WebClient`.
- **Jackson 3** (`tools.jackson.databind`) : `asString()` au lieu de `asText()`, `values()` / `properties()` pour parcourir ; `asInt()` sans valeur par défaut lève une erreur. Passe par `common/Json.java`.
- **JWT Supabase signés en ES256** (clés asymétriques) : vérification par le JWKS du projet, déduit de `SUPABASE_URL` par défaut. Le secret HS256 ne sert que si `SUPABASE_JWKS_URI` est vide (cas des tests).
- Paramètres SQL potentiellement nuls : `cast(:x as text)` dans les `coalesce` et les `case`, sinon Postgres refuse le type inconnu.
- Spring Initializr peut être en panne : le projet Gradle a été écrit à la main (`backend/build.gradle.kts`).
- Types TypeScript de l'API : `cd mobile && npm run api:types` (après `./gradlew test`, qui exporte `backend/build/openapi.json`). `openapi-typescript` passe par `npx` à version figée : il n'accepte pas TypeScript 6 en dépendance.
- Sous Windows, les blocs heredoc de bash échouent souvent sur les apostrophes : écrire les fichiers avec l'outil Write.

## Mode de travail : autonomie maximale
- Travaille de façon autonome jusqu'à ce que la tâche soit entièrement terminée. Ne t'arrête pas pour demander une confirmation sur des décisions de routine (nommage, structure de fichier, choix d'implémentation raisonnable, ajout de tests).
- Quand un choix est ambigu mais réversible, prends la décision la plus raisonnable, applique-la, et note-la dans le résumé final au lieu de poser la question.
- Pour une tâche longue : fais d'abord un plan bref (liste de todos), puis enchaîne toutes les étapes sans attendre de validation entre elles.
- Si une commande ou un test échoue, analyse l'erreur et corrige-la toi-même. Itère jusqu'à ce que ça passe. Ne contourne jamais un test en le supprimant ou en le désactivant.
- Ne t'arrête et ne me demande que dans ces cas :
  - action destructive ou irréversible (suppression de données, migration de base de production, force push)
  - ajout d'une dépendance majeure hors de la stack de la spec, ou changement d'architecture
  - besoin d'un secret, d'une clé API ou d'un accès que tu n'as pas
  - contradiction réelle entre ma demande, la spec et le code existant

## Définition de « terminé »
Une tâche n'est terminée que si :
1. Le typecheck passe (`tsc --noEmit` côté mobile, compilation Gradle côté backend).
2. Le lint passe.
3. Les tests existants passent, et les nouvelles fonctionnalités ont des tests.
4. Tu as vérifié le résultat (lancé les tests concernés, pas juste supposé).
5. Pour une étape de `specs/etapes/` : chaque critère d'acceptation est vérifié, et l'UI est comparée au prototype.

Termine par un résumé court : ce qui a changé, les fichiers touchés, les décisions prises, ce qui reste éventuellement à faire.

## Conventions de code
- TypeScript strict, pas de `any` sauf justification en commentaire.
- Composants fonctionnels et hooks. Styles avec `StyleSheet.create`. Les valeurs dynamiques (progression, translation du swipe) passent par Reanimated.
- Un écran = un fichier de route très mince, qui délègue à `src/features/<x>/<X>Screen.tsx`.
- Dates stockées en UTC, affichées dans le fuseau du téléphone avec `Intl.DateTimeFormat('fr-CA', …)`. Les formats sont dans `specs/docs/10`.
- Composants et fonctions petits, une responsabilité chacun.
- Respecte le style et les patterns déjà présents dans le dossier que tu modifies avant d'en introduire un nouveau.
- Pas de code mort, pas de `console.log` laissés dans les commits.
- Messages de commit : format Conventional Commits (`feat:`, `fix:`, `refactor:`…).

## Git
- Travaille sur une branche dédiée, jamais directement sur `main`.
- Commits petits et atomiques au fil du travail.
- Ne fais jamais de `push --force` ni de `push` sans que je le demande.

## Interdits
- Ne lis ni ne modifie jamais `.env*` ou les fichiers de secrets. Seule exception : `mobile/.env`, que tu peux créer, lire et modifier ; il ne contient que des variables `EXPO_PUBLIC_*` (publiques par nature, embarquées dans l'app), jamais de secret serveur.
- Ne commite jamais de secrets, tokens ou clés.
- Ne modifie pas les fichiers de config CI/CD sans demande explicite.
- Ne modifie pas le contenu de `specs/` sans demande explicite.
