# 10 — État client, données, hors ligne, textes

## 1. Modèle client (TypeScript)
```ts
type MediaType = 'movie' | 'tv' | 'anime';
type Provider = { id: number; name: string; short: string; logoPath?: string; link?: string };
type Availability = { sub: Provider[]; rent: Provider[]; buy: Provider[]; link?: string };

type Title = {
  id: string;                 // `${type}-${tmdbId}`
  tmdbId: number; type: MediaType;
  title: string; originalTitle?: string; year?: number;
  posterPath?: string; backdropPath?: string;
  genres: string[]; certification?: string; runtime?: number; // minutes (épisode moyen pour les séries)
  imdbRating?: number; imdbVotes?: string; rtScore?: number;
  overview?: string; originalLanguage?: string; country?: string; studio?: string;
  // films
  releaseTheatrical?: string; releaseDigital?: string;   // ISO, région de l'utilisateur
  collectionId?: number;
  // séries
  status?: 'En cours' | 'Terminée' | 'Annulée'; network?: string; ended?: boolean;
  seasons?: Season[];
  availability: Availability;
};
type Season = { number: number; name: string; episodeCount: number; airDate?: string; episodes: Episode[] };
type Episode = { id: number; season: number; number: number; name: string; overview?: string; stillPath?: string; airstamp?: string; runtime?: number; imdbRating?: number };

type UserTitle = { titleId: string; status: 'towatch' | 'watched' | 'following' | 'abandoned'; addedAt: string; watchedAt?: string; notificationsEnabled: boolean };
type WatchedEpisodes = Record<string /*titleId*/, Record<string /*`${s}:${e}`*/, string /*watchedAt*/>>;
```

## 2. Logique pure (`src/domain/`) — porter `reference/app.js` et la tester
| Fichier | Fonction | Origine dans app.js |
|---|---|---|
| `availability.ts` | `movieState(t, now)` → `'upcoming'|'avail'|'cinema'|'unknown'` | `A.mState` |
| `availability.ts` | `bestProvider(t, myProviders)` | `A.bestPlat` |
| `badge.ts` | `posterBadge(t, myProviders, now)` | `A.badge` |
| `series.ts` | `seriesInfo(t, watched, now)` → `{ aired, watchedCount, next, upcoming, remaining }` (saison 0 exclue) | `A.sInfo` |
| `series.ts` | `seriesSection(t, userTitle, watched, now)` | `A.sec` |
| `series.ts` | `previousUnwatched(t, ep, watched, now)` | `A.checkEp` |
| `watchlist.ts` | `filterFilms`, `sortFilms`, `groupSeries` (ordre et tris de `06`) | `vals()` › watchlist |
| `upcoming.ts` | `buildUpcoming(titles, userTitles, watched, filter, now)` → `{ groups, noDate }` | `vals()` › upcoming |
| `format.ts` | formats de date et de nombre (§5) | `fDay`, `fShort`, `fLong`, `fRun` |
| `gradient.ts` | `hash`, `gradientFor(key)` | `hash`, `bgOf` |
| `initials.ts` | `initials(name)` : deux premiers mots qui commencent par une lettre | `ini` |

Tests obligatoires : chaque ligne du tableau de sections (`01` §3), le prochain épisode avec une saison 0 présente, `Tout marquer comme vu` qui ignore les épisodes non diffusés, le badge selon la priorité des plateformes, le passage à minuit pour « Aujourd'hui » et « Demain ».

## 3. Requêtes (TanStack Query)
| Clé | Endpoint | staleTime | Persistée hors ligne |
|---|---|---|---|
| `['watchlist', type]` | `GET /me/watchlist?type=` | 5 min | oui |
| `['upcoming', filter]` | `GET /me/upcoming` | 15 min | oui |
| `['profile']` | `GET /me/profile` | ∞ (invalidée à la modification) | oui |
| `['title', type, id]` | `GET /titles/{type}/{id}` | 24 h | oui pour les titres de la liste |
| `['season', id, n]` | `GET /titles/tv/{id}/seasons/{n}` | 24 h | oui pour les titres de la liste |
| `['person', id]` | `GET /people/{id}` | 24 h | non |
| `['search', q, tab]` | `GET /search` | 10 min | non |
| `['discover', params]` | `GET /discover` | 24 h | non |

Persistance : `@tanstack/query-async-storage-persister` + `persistQueryClient`, `maxAge` 7 jours. `onlineManager` branché sur `@react-native-community/netinfo`.

## 4. Mutations (optimistes et compatibles hors ligne)
Chaque mutation : 1) sauvegarde un instantané pour Annuler ; 2) applique le changement au cache tout de suite ; 3) l'envoie (ou le met en file si hors ligne, avec `networkMode: 'offlineFirst'` et des mutations persistées par `setMutationDefaults`) ; 4) en cas d'échec définitif, restaure l'instantané et affiche le toast **« Impossible d'enregistrer, réessaie »**.

| Mutation | Endpoint |
|---|---|
| ajouter un titre | `POST /me/titles {tmdbId, type, status}` |
| changer de statut / alertes | `PATCH /me/titles/{id} {status?, watchedAt?, notificationsEnabled?}` |
| retirer | `DELETE /me/titles/{id}` |
| cocher des épisodes | `POST /me/episodes/watched {episodeIds:[…]}` |
| décocher | `DELETE /me/episodes/watched {episodeIds:[…]}` |
| profil / plateformes | `PUT /me/profile`, `PUT /me/providers` |

Annuler = rejouer l'inverse (ex. `DELETE` après `POST`) et restaurer l'instantané local.

## 5. Formats (fr-CA, fuseau du téléphone)
| Nom | Exemple | Implémentation |
|---|---|---|
| jour court | `18 déc.` | `{day:'numeric', month:'short'}` |
| date longue | `18 décembre 2026` | `{day:'numeric', month:'long', year:'numeric'}` |
| jour relatif | `Aujourd'hui` · `Demain` · `ven. 16 oct.` | sinon `{weekday:'short', day:'numeric', month:'short'}` ; en libellé de groupe, première lettre en majuscule |
| jour de la bande | `Sam` | `{weekday:'short'}`, sans le point, première lettre en majuscule |
| heure | `21 h 00` | `{hour:'2-digit', minute:'2-digit'}` en fr-CA donne `21 h 00` |
| durée | `2 h 46` · `45 min` · `Durée inconnue` | `fRun` |
| note | `8,5/10` | `toLocaleString('fr-CA', {maximumFractionDigits:1})` |
| pourcentage | `92 %` | espace insécable |
| votes | `640 k votes` · `1,4 M votes` | < 1 000 000 : milliers arrondis + ` k` ; sinon millions à une décimale + ` M` |
| code d'épisode | `S04 E03` | deux chiffres minimum |
« Aujourd'hui » / « Demain » se calculent sur les jours calendaires locaux, pas sur des tranches de 24 h.

## 6. État d'interface (Zustand, non persisté)
`toast {message, undo?}` · `actionSheet {title, options}` · `dialog {title, body?, actions}` · `episodeSheet {titleId, season, episode}` · `platformsSheetOpen` · `swipedCardId` · `collapsedSections` (défaut `{done:true, abandoned:true}`) · `watchlistTab`, `filmSegment`, `filmFilter`, `filmSort` · `upcomingFilter`, `noDateOpen` · `discoverTab`.

## 7. Textes des toasts (exhaustif)
| Action | Message | Annuler |
|---|---|---|
| ajout rapide d'un film | Ajouté à ma liste | oui |
| ajout rapide d'une série/animé | Série suivie | oui |
| retrait rapide (affiche, ligne, fiche film) | Retiré de ma liste | oui |
| film marqué vu | Marqué comme vu | oui |
| film remis à voir | Remis dans À voir | oui |
| un épisode coché | Épisode marqué comme vu | oui |
| n épisodes cochés | {n} épisodes marqués comme vus | oui |
| un épisode décoché | Épisode décoché | oui |
| saison décochée | Saison décochée | oui |
| série abandonnée (swipe ou menu) | Série abandonnée | oui |
| série retirée par swipe | Retirée de ma liste | oui |
| suivi repris | Suivi repris | oui |
| « Ne plus suivre » | Série retirée | oui |
| cloche coupée / activée | Alertes coupées pour ce titre / Alertes activées pour ce titre | non |
| tap plateforme | Ouverture de {plateforme}… | non |
| tap bande-annonce | Ouverture de YouTube… | non |
| loupe hors ligne | Recherche indisponible hors ligne | non |
| jour sans événement | Rien de prévu à partir de ce jour | non |
| mutation échouée | Impossible d'enregistrer, réessaie | non |

Exception : l'onboarding n'affiche aucun toast.

## 8. Erreurs réseau (zone concernée)
Bloc dans la zone (padding 24, colonne gap 8) : **« Impossible de charger »** 16/500 · **« Vérifie ta connexion et réessaie. »** 14 `neutral400` · bouton secondaire 44 **« Réessayer »** → `refetch()`.
