# Étape 1 — Socle du projet

**Objectif** : un dépôt qui démarre, le thème Nocturne en place et la navigation vide.

## Tâches
1. Monorepo `mobile/`, `backend/`, `supabase/`. Copier `CLAUDE.md` à la racine, `docs/` et `reference/` à côté.
2. `mobile` : `npx create-expo-app@latest -t expo-template-blank-typescript`. Installer : expo-router, react-native-safe-area-context, react-native-screens, react-native-gesture-handler, react-native-reanimated, expo-linear-gradient, expo-blur, expo-image, expo-haptics, expo-notifications, expo-localization, expo-apple-authentication, expo-web-browser, expo-constants, @expo-google-fonts/inter, phosphor-react-native, react-native-svg, @tanstack/react-query, @tanstack/query-async-storage-persister, @tanstack/react-query-persist-client, @react-native-async-storage/async-storage, @react-native-community/netinfo, @react-native-community/slider, zustand, @supabase/supabase-js. TypeScript `strict`.
3. `app.config.ts` : nom « Suivi », scheme `suivi`, `userInterfaceStyle: 'dark'`, fond de splash `#161826`, icône Popcorn accent, orientation portrait, `ios.usesAppleSignIn: true`.
4. `src/theme/tokens.ts`, `typography.ts`, `gradients.ts` : **toutes** les valeurs de `docs/02-design-tokens.md`, avec les mêmes noms.
5. `app/_layout.tsx` : chargement des polices Inter (le splash reste affiché jusqu'au chargement), `GestureHandlerRootView`, `SafeAreaProvider`, `StatusBar style="light"`, Stack `headerShown:false` + `contentStyle:{backgroundColor: bg}`.
6. Routes vides de `docs/04-navigation.md` §1, chacune affichant son nom.
7. ESLint + Prettier ; règle qui interdit les littéraux `#xxxxxx` hors de `src/theme`.

## Critères d'acceptation
- `npx expo start` ouvre l'app sur iOS et Android sans avertissement.
- Toutes les routes existent ; le fond est `#161826` partout ; la police Inter est utilisée.
- `tsc --noEmit` et le lint passent.
