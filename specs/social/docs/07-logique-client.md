# 07 — Logique client

Référence : `reference/social.js` (fonctions `A.*`). Porte la logique pure dans `src/domain/social/` avec des tests unitaires.

## 1. Fonctions pures
| Fichier | Fonction | Règle | Origine dans le prototype |
|---|---|---|---|
| `username.ts` | `cleanUsername(raw)` | minuscules, sans accents, `[a-z0-9._]` seulement, 20 caractères max | `clean` |
| `username.ts` | `isValidUsername(u)` | `^[a-z0-9._]{3,20}$` et pas dans la liste réservée | `A.uCheck` |
| `username.ts` | `proposeUsername(displayName)` | prénom + « . » + initiale du nom, nettoyé | — |
| `followButton.ts` | `followButtonState(member)` | `blocked` › `following` › `pending` › `followsMe` › `none` → libellé, icône, variante (`docs/03`) | `A.fb` |
| `followingSummary.ts` | `followingText(firstNames[])` | 1 / 2 / 3 / ≥ 4 (`docs/03` FollowingCard) | `A.titleSoc` |
| `followingSummary.ts` | `followingStatus(item, type)` | « Vu le 12 oct. », « En cours · S02 E05 »… | `A.socStatus` |
| `common.ts` | `commonLabel(n)` | 0 « Aucun titre en commun », 1 « 1 titre en commun », n « n titres en commun » ; afficher si ≥ 3 (sauf SawCard) | `titleSoc` |
| `feed.ts` | `activitySentence(activity, myWatched, spoilerOn)` | phrases et masquage de `docs/04` §4.11 → `{ name, verb, title, tail, visual: 'poster'|'still'|'avatar' }` | `A.actVM` |
| `feed.ts` | `groupByDay(activities, now)` | « Aujourd'hui », « Hier », « Mar. 20 oct. » (jours calendaires locaux) | `dayLabel` |
| `feed.ts` | `cardWhen(date, now)` | aujourd'hui → « 21 h 40 », hier → « Hier », sinon « 7 oct. » | `when` |
| `profileLists.ts` | `mySeriesBucket(section)` | À regarder / Pas regardé depuis un moment / À jour → `in_progress` ; Terminées → `finished` ; Pas encore commencées → `towatch` ; Abandonnées → exclu | `A.profVM` |
| `counters.ts` | `counterLabel(n, kind)` | singulier pour 0 et 1 ; ≥ 10 000 → « 12,4 k » | `profVM` |
| `privacy.ts` | `profileAccess(profile)` | `isMe`, `blocked`, `locked = isPrivate && followState !== 'following'` | `profVM` |

Tests obligatoires : chaque état du bouton de suivi ; masquage anti-spoiler d'un épisode vu et non vu ; regroupement d'épisodes ; textes de résumé pour 1, 2, 3 et 7 abonnements ; libellés de jour autour de minuit ; nettoyage d'un pseudo avec accents et majuscules (« Éloïse.B » → `eloise.b`).

## 2. Requêtes (TanStack Query, à brancher sur le client existant)
| Clé | Endpoint | staleTime | Persistée hors ligne |
|---|---|---|---|
| `['me','profile']` | `GET /me/profile` | existant | oui |
| `['user', username]` | `GET /users/{u}` | 2 min | oui (profils visités) |
| `['user', username, 'titles', type, status]` | `GET /users/{u}/titles` (infinite) | 5 min | oui |
| `['user', username, 'followers'|'following', q]` | infinite | 2 min | non |
| `['feed']` | `GET /me/feed` (infinite) | 2 min | oui (1re page) |
| `['title', type, id, 'social']` | `GET /titles/…/social` | 10 min | oui |
| `['members', q]` | `GET /users/search` | 1 min | non |
| `['followRequests']` | `GET /me/follow-requests` | 1 min | non |
| `['blocks']` | `GET /me/blocks` | 10 min | non |
| `['recentProfiles']` | `GET /me/recent-profiles` | 10 min | oui |
| `['usernameAvailable', u]` | `GET /users/username-available` | 0 | non |

## 3. Mutations optimistes
Pour suivre, se désabonner, annuler, accepter, refuser, tout accepter, bloquer, débloquer et retirer un abonné :
1. **Hors ligne** → ne rien faire, toast « Connexion requise ».
2. Instantané des caches concernés.
3. Mise à jour immédiate de **toutes** les occurrences de la personne : `['user',u]`, lignes de membres dans les listes, recherche, `['title',…,'social']`, compteurs de mon profil. Utilise une fonction `patchMemberEverywhere(username, patch)` qui parcourt les requêtes en cache avec `queryClient.setQueriesData`.
4. Appel API. Erreur → restauration de l'instantané + toast d'erreur (`429` : message de limite ; `403` : « Impossible de suivre ce profil »).
5. Invalidation de `['feed']` après suivre / se désabonner / bloquer, et de `['title',…,'social']` des fiches ouvertes.
- « Annuler » d'un toast rejoue l'action inverse (se réabonner, ré-ajouter l'abonné via `POST /me/followers/{u}/restore`, ou simplement `POST /follow` pour se réabonner).

## 4. Store d'interface (ajouts)
`inviteSheetOpen` · `followingSheet: { titleKey } | null` · `pendingDeepLink` (persisté) · `searchTab` (ajout de `'members'`).

## 5. Détails d'implémentation
- Bascule « @ » : dans `onChangeText` de la recherche, si la nouvelle valeur commence par « @ » et que l'onglet n'est pas Membres, passer sur Membres. Le texte envoyé à l'API est sans « @ » ni espaces.
- Profils visités : POST au moment d'ouvrir un profil (pas moi, pas un profil introuvable) ; liste locale optimiste de 5 maximum.
- QR : `react-native-qrcode-svg` avec `value = https://{DOMAINE}/u/{username}`, `ecl="H"`, `size=200`, `color` = rôle texte clair, `backgroundColor` = `bg`, `logo` = avatar (taille 48, `logoBorderRadius 24`, `logoBackgroundColor` = `bg`).
- Scanner : parser l'URL et n'accepter que l'hôte `{DOMAINE}` ou le schéma `zabava:`, puis un pseudo valide.
- Le bouton +/coche des affiches de profil appelle exactement les mutations existantes de Ma liste.
