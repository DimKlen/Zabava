# 04 — Navigation

## 1. Arborescence Expo Router
```
app/
  _layout.tsx                 # polices, QueryClient, SafeArea, GestureHandler, garde d'auth, hôtes Toast/Dialog/Sheet
  index.tsx                   # redirection : session ? (onboarding fait ? /(tabs)/watchlist : /onboarding/region) : /login
  login.tsx
  onboarding/
    _layout.tsx               # Stack sans en-tête, animation 'fade' (300 ms), en-tête maison (progression + Passer)
    region.tsx                # étape 1
    platforms.tsx             # étape 2
    titles.tsx                # étape 3
    notifications.tsx         # explication + permission
  (tabs)/
    _layout.tsx               # Tabs avec TabBar maison (docs/03)
    watchlist.tsx             # Ma liste (onglet initial)
    discover.tsx
    upcoming.tsx
    profile.tsx
  title/[type]/[id].tsx       # type = movie | tv | anime ; params facultatifs : tab=episodes|infos, season=n, episode=n
  person/[id].tsx
  genre/[type]/[genre].tsx
  search.tsx                  # présentation 'fade' (180 ms)
```
- Stack racine : `headerShown: false`, fond `bg` (`contentStyle`), aucun en-tête natif nulle part.
- `title`, `person`, `genre` : `animation: 'slide_from_right'`, avec une durée approchant 220 ms (`animationDuration: 220`). Le prototype fait un glissement de 40 pt + fondu ; sur iOS, le glissement natif plein écran est accepté et le geste de retour par bord gauche doit rester actif.
- `search` : `animation: 'fade'`, 180 ms.
- Les sheets (action, épisode, plateformes, recherche avancée) et les dialogues **ne sont pas des routes** : ce sont des overlays pilotés par le store UI, rendus par des hôtes dans `_layout.tsx` (ou dans l'écran pour la recherche avancée).

## 2. Parcours de premier lancement
1. Splash Expo (logo Popcorn accent sur `bg`).
2. `/login` → OAuth Apple ou Google (Supabase).
3. `/onboarding/region` → `/onboarding/platforms` → `/onboarding/titles` → `/onboarding/notifications`.
4. `/(tabs)/watchlist`, onglet **Films**, segment **À voir**. 700 ms de squelettes au premier affichage, ou jusqu'à la fin du chargement.

Aux lancements suivants, si la session est valide : directement `/(tabs)/watchlist` (avec `profiles.onboarded_at` non nul). Sinon `/login`.
La déconnexion et la suppression du compte renvoient à `/login` (`router.replace`) en vidant le cache.

## 3. Matrice des liens

| Depuis | Élément | Action | Vers |
|---|---|---|---|
| Connexion | « Continuer avec Apple » / « Continuer avec Google » | OAuth ; pendant l'attente « Connexion en cours… » | onboarding/region (nouveau compte) ou watchlist |
| Connexion | liens CGU / confidentialité | `WebBrowser.openBrowserAsync` | web |
| Onboarding (toutes étapes) | « Passer » | étape suivante (sans enregistrer de nouveau choix) | étape +1 ; depuis titles → notifications |
| Onboarding 2–3 | CaretLeft | étape précédente | étape −1 |
| Onboarding 1–2 | « Continuer » | enregistre, puis étape suivante | — |
| Onboarding 3 | « Terminer » | enregistre `onboarded_at` | notifications |
| Notifications | « Activer les notifications » | `Notifications.requestPermissionsAsync()` ; si accordé : enregistre le jeton push | watchlist (`replace`) |
| Notifications | « Plus tard » | rien | watchlist (`replace`) |
| Tab bar | 4 onglets | changer d'onglet ; re-tap = remonter en haut | — |
| Ma liste, Découvrir | loupe | `router.push('/search')` (hors ligne : toast « Recherche indisponible hors ligne ») | search |
| Ma liste › Films | affiche | — | title/movie/[id] |
| Ma liste › Films | appui long / clic droit | ActionSheet film | — |
| Ma liste › Films | « Date d'ajout » (tri) | ActionSheet « Trier par » | — |
| Ma liste › Séries/Animés | carte | — | title/[type]/[id]?tab=episodes&season={saison du prochain épisode} |
| Ma liste › Séries/Animés | « Commencer » | — | title/[type]/[id]?tab=episodes&season=1 |
| Ma liste › Séries/Animés | ligne (À jour, Terminées, Abandonnées) | — | title/[type]/[id] |
| Ma liste (vide) | « Découvrir des films / séries / animés » | onglet Découvrir sur le bon type | discover |
| Découvrir | affiche | — | title |
| Découvrir | tuile de genre | — | genre/[type]/[genre] |
| À venir | élément | — | title |
| À venir | jour de la bande | défilement animé vers le 1er groupe ≥ ce jour (décalage 72) ; aucun → toast « Rien de prévu à partir de ce jour » | — |
| À venir (vide) | « Suivre des séries » | onglet Découvrir, type Séries | discover |
| Profil | Mes plateformes | PlatformsSheet | — |
| Profil | Se déconnecter / Supprimer mon compte | Dialog | login |
| Fiche | CaretLeft | `router.back()` | précédent |
| Fiche | cloche | bascule les alertes du titre + toast | — |
| Fiche série | « … » / bouton « Suivie » | ActionSheet série | — |
| Fiche | pastille de plateforme | `Linking.openURL(lien JustWatch)` + toast | externe |
| Fiche | bande-annonce | `Linking.openURL('https://www.youtube.com/watch?v=' + key)` + toast « Ouverture de YouTube… » | externe |
| Fiche | membre du casting | — | person/[id] |
| Fiche | affiche saga / similaire | `router.push` (empile une nouvelle fiche) | title |
| Fiche série › Épisodes | ligne d'épisode | EpisodeSheet | — |
| Personne | affiche | — | title |
| Liste de genre | affiche | — | title |
| Recherche | « Annuler » | `router.back()` | précédent |
| Recherche | SlidersHorizontal, « Modifier », « Essayer la recherche avancée » | AdvancedSearchSheet | — |
| Recherche | ligne de titre | ajoute la requête aux récentes | title |
| Recherche | ligne de personne | ajoute la requête aux récentes | person/[id] |
| Recherche | recherche récente | remplit le champ et lance la recherche immédiatement (sans délai) | — |

Le retour arrière Android (`BackHandler`) ferme d'abord le dialogue ouvert, puis la sheet, puis la carte swipée, puis dépile l'écran.

## 4. Liens profonds (notifications)
Schéma `suivi://` et liens universels `https://suivi.app/…` (domaine à définir).

| Notification | Lien |
|---|---|
| Nouvel épisode | `suivi://title/tv/{tmdbId}?tab=episodes&season={s}&episode={e}` (anime : `title/anime/…`) — ouvre la fiche, saison s, puis la EpisodeSheet de l'épisode |
| N nouveaux épisodes (groupée) | `suivi://upcoming` |
| Sortie en salle / Disponible en streaming | `suivi://title/movie/{tmdbId}` |
| Nouvelle saison | `suivi://title/{type}/{tmdbId}?tab=episodes&season={n}` |

App fermée : la pile reconstruite est `(tabs)/watchlist` puis la fiche, pour que « retour » ramène à Ma liste.

## 5. Conservation de l'état
- Chaque onglet garde sa position de défilement et ses sous-onglets (Films/Séries/Animés, À voir/Vus, filtre, tri) pendant la session.
- Ma liste → onglet par défaut Films à chaque lancement à froid.
- Sur une fiche, l'onglet Épisodes/Infos, la saison et « Voir plus » sont propres à chaque instance de fiche dans la pile.
- La recherche garde la requête, l'onglet de résultats et les filtres avancés tant que l'écran est monté. Fermer la recherche remet tout à zéro, sauf les recherches récentes (persistées).
- Les recherches récentes (6 au maximum, les plus récentes d'abord, sans doublon) sont persistées dans AsyncStorage.
