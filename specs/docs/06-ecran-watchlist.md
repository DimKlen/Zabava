# 06 — Ma liste (`/(tabs)/watchlist`)

Référence : prototype, bloc `isWatch`, et `vals()` › watchlist dans `app.js`.

## Structure commune
1. Bandeau hors ligne (si besoin).
2. ScreenHeader : **« Ma liste »** + loupe.
3. UnderlineTabs (gap 22, padding 0 16) : **Films** (défaut) · **Séries** · **Animés**. Changer d'onglet referme la carte swipée.
4. Contenu défilant (padding bas 24 au-dessus de la tab bar). Tirer pour rafraîchir (`RefreshControl`, teinte `accent`) relance `GET /me/watchlist`.

## Onglet Films

### Barre de contrôle
Rangée `space-between`, centrée, padding `14 16 0` :
- gauche : Segmented **À voir | Vus** ;
- droite (segment À voir seulement) : bouton ghost hauteur 36, texte 13 `neutral300`, icône SortAscending 16, libellé = tri courant.

### Tri (ActionSheet « Trier par »)
Options (icône Check pour l'option active, Circle pour les autres) :
| Option | Ordre |
|---|---|
| **Date d'ajout** (défaut) | `added_at` décroissant |
| **Date de sortie** | date de sortie en salle croissante (la plus ancienne en premier, les à-venir à la fin) |
| **Titre** | `localeCompare(…, 'fr')` |
| **Note IMDb** | note décroissante, sans note à la fin |

### Filtres rapides (segment À voir seulement)
Rangée horizontale défilante de Chips (gap 8, padding `12 16 0`) :
| Chip | Règle |
|---|---|
| **Tout** (défaut) | aucun filtre |
| **Sur mes plateformes** | disponibilité `avail` **et** au moins un abonnement chez une de mes plateformes |
| **Au cinéma** | disponibilité `cinema` |
| **Pas encore sorti** | disponibilité `upcoming` |

### Grille
- Ligne d'aide 12 `neutral500`, padding `12 16 0` : **« {n} films · appui long pour plus d'options »** (« 1 film » au singulier). Elle n'apparaît que s'il y a des résultats.
- PosterGrid, padding `8 16 0`. Affiches avec badge et « + » (coché, puisque le film est dans la liste).
- Tap → fiche film.
- Tap sur la coche → retire le film (toast « Retiré de ma liste » + Annuler) ; l'affiche disparaît de la grille.
- Appui long (480 ms) / clic droit → ActionSheet avec le titre du film :
  - À voir : **Marquer comme vu** (Eye) · **Retirer de ma liste** (Trash)
  - Vus : **Marquer comme non vu** (EyeSlash) · **Retirer de ma liste** (Trash)
- Segment **Vus** : pas de tri ni de filtre ; ordre `watched_at` décroissant.

### Chargement
9 squelettes d'affiche en grille, padding `14 16 0`, tant que la première requête n'a pas répondu (et au moins 700 ms après la connexion, pour éviter un flash).

### États vides
| Cas | Titre | Texte | Bouton → action |
|---|---|---|---|
| Aucun film À voir | **Ta liste est vide** | Ajoute des films pour les retrouver ici. | **Découvrir des films** → Découvrir › Films |
| Filtre sans résultat | **Aucun film pour ce filtre** | Essaie un autre filtre. | **Tout afficher** → filtre « Tout » |
| Aucun film Vu | **Aucun film vu pour l'instant** | Les films que tu marques comme vus apparaîtront ici. | **Voir ma liste** → segment À voir |
Icône FilmStrip 40.

## Onglets Séries et Animés
Les deux onglets ont exactement la même structure ; seul le type (`tv` ou `anime`) change.

- Si au moins une carte « À regarder » existe : ligne d'aide 12 `neutral500`, padding `12 16 0` : **« Coche pour avancer · glisse une carte vers la gauche pour plus d'actions »**.
- Liste verticale de sections repliables, dans cet ordre. **Une section vide n'est pas affichée.**

| # | Section | Contenu | Tri | Repliée par défaut |
|---|---|---|---|---|
| 1 | **À regarder** | NextEpisodeCard | dernier visionnage, le plus récent en premier | non |
| 2 | **Pas regardé depuis un moment** | NextEpisodeCard | idem | non |
| 3 | **Pas encore commencées** | carrousel d'affiches 112 + bouton « Commencer » | date d'ajout décroissante | non |
| 4 | **À jour** | lignes compactes | date d'ajout décroissante | non |
| 5 | **Terminées** | lignes compactes | idem | **oui** |
| 6 | **Abandonnées** | lignes compactes | idem | **oui** |

- En-tête de section : SectionHeader (titre, nombre de titres, caret). L'état replié est conservé pendant la session.
- Cartes : colonne gap 8, padding `4 16 0`. Comportement détaillé dans `03-composants.md` › NextEpisodeCard.
- Carrousel « Pas encore commencées » : padding `4 16 0`, gap 10. Sous chaque affiche (gap 6), bouton secondaire 34, 13 pt, **« Commencer »** → fiche, onglet Épisodes, saison 1.
- Lignes compactes : colonne gap 4, padding `4 16 0`. Ligne : rangée gap 12, padding 6 (marge horizontale −6 pour aligner le contenu), rayon 8, fond `surface` à la pression. Contenu : Poster compact 44 · nom 15/500 · libellé 13 `neutral400` · CaretRight `neutral600`. Libellés :
  - À jour : **« Prochain épisode le {d MMM} »** si un épisode est daté, sinon **« En attente de la saison {n+1} »**.
  - Terminées : **« Terminée · {n} épisodes vus »**.
  - Abandonnées : **« Abandonnée · {vus}/{diffusés} vus »**.
- Chargement : 3 squelettes de carte.
- Vide (aucun titre de ce type suivi) : icône TelevisionSimple 40, titre **« Aucune série suivie »** / **« Aucun animé suivi »**, bouton **« Découvrir des séries »** / **« Découvrir des animés »** → Découvrir sur le bon type.

## Données
`GET /me/watchlist?type=movie|tv|anime` renvoie, pour chaque titre : les champs d'affichage (id, tmdb_id, type, title, poster_path, rel/dig en dates, providers de la région, imdb), le `user_title` (status, added_at, watched_at, notifications_enabled) et, pour les séries, les épisodes (s, e, name, still_path, airstamp, runtime) avec les épisodes vus. Les sections sont calculées **côté client** (`src/domain/sections.ts`), ce qui permet le hors ligne et les mises à jour optimistes.
