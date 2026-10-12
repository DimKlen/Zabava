# 08 — Recherche, recherche avancée, Découvrir

## 8.1 Recherche (`/search`)
Entrée en fondu (180 ms). Padding haut = zone sûre. Tab bar cachée.

### Barre (rangée gap 8, padding `8 8 8 16`)
- Champ (flex 1) : `.input` de hauteur 42, `paddingLeft 34`, icône MagnifyingGlass 16 `neutral500` à `left 11`, centrée verticalement. Placeholder **« Titre, acteur, actrice… »** (couleur `neutral500`). `autoFocus`, clavier ouvert à l'arrivée, `returnKeyType="search"`, `autoCorrect={false}`, bouton d'effacement natif (iOS `clearButtonMode="while-editing"`).
- Bouton Filtres : `.btn-icon` secondaire 42 × 42, SlidersHorizontal 18 → AdvancedSearchSheet.
- **« Annuler »** : ghost, hauteur 42, padding 8 → `router.back()`.

### État « sans saisie »
1. **Recherches récentes** (si la liste n'est pas vide) : en-tête rangée `space-between`, padding `12 16 6` : h6 **« RECHERCHES RÉCENTES »** + bouton ghost 32, 13 pt, **« Effacer »** (vide la liste). Lignes : hauteur min 44, padding `0 8 0 16`, gap 12, ClockCounterClockwise `neutral500`, texte 15 flex 1, bouton X (40 × 40, `neutral500`) qui retire l'entrée. Fond `surface` à la pression. Tap → remplit le champ et cherche tout de suite.
2. **Tendances du moment** : h6, padding `18 16 6`. 5 lignes de résultat (`/trending/all/day`).

### Ligne de résultat
Rangée gap 12, padding `6 8 6 16`, fond `surface` à la pression.
- **Titre** : mini-affiche 40 × 60, rayon 6 (`w92`) · titre 15/500 · `{année} · {Film|Série|Animé}` 13 `neutral400` · bouton « + » : zone 44, visuel 32 rond, bord 1 `neutral700`, Plus 15 `text` ; dans la liste : fond `accent`, bord `accent`, Check 15 `bg`. Le tap sur le bouton fait un ajout ou retrait rapide (avec toast), sans ouvrir la fiche.
- **Personne** : rond 40 (marge verticale 10), photo ou dégradé + initiales 13/500 · nom 15/500 · **« Personne · {2 titres connus séparés par une virgule} »** 13 `neutral400`, 1 ligne · CaretRight `neutral600` (marge droite 12).

### État « avec saisie »
- La recherche part **300 ms** après la dernière frappe (debounce). Les requêtes en cours sont annulées (`AbortController`).
- UnderlineTabs défilantes (gap 20, 14/500) : **Tout** · **Films** · **Séries** · **Animés** · **Personnes**.
  - Tout : jusqu'à 3 personnes en premier, puis les titres dans l'ordre de pertinence.
  - Films / Séries / Animés : les titres du type.
  - Personnes : toutes les personnes.
- Pendant l'attente : 3 lignes squelettes.
- Résultats : liste (padding haut 6), pagination infinie.
- Aucun résultat : padding `40 16`, colonne alignée à gauche, gap 8 : MagnifyingGlass 36 `neutral600` · **« Aucun résultat pour « {requête} » »** 16/500 · bouton principal 44 **« Essayer la recherche avancée »**.
- La requête est ajoutée aux récentes quand on ouvre un résultat ou qu'on valide au clavier.
- Données : `GET /search?q=&type=all|movie|tv|anime|person&page=`.

### État « recherche avancée appliquée »
Remplace les états précédents tant qu'il est actif :
- En-tête rangée `space-between`, padding `8 16` : colonne **« Recherche avancée »** 16/500 + **« {n} résultats »** 12 `neutral500` ; à droite, deux boutons ghost 36 : **« Modifier »** (rouvre la sheet) · **« Effacer »** (texte `neutral400` ; sort du mode avancé sans réinitialiser les filtres).
- PosterGrid (padding `4 16 0`) avec badges et « + », chargement infini.
- Vide : **« Aucun titre ne correspond à ces filtres. »** 14 `neutral400`, padding `32 16`.
- Taper dans le champ ne sort pas du mode avancé ; seul « Effacer » le fait.

## 8.2 AdvancedSearchSheet
BottomSheet de hauteur `écran − 56`, entrée 280 ms, colonne.
- **En-tête** (padding `10 8 6 16`, `space-between`) : **« Recherche avancée »** 18/500 ; à droite, **« Réinitialiser »** (ghost 40, `neutral400`) et le bouton fermer (ghost icône 44, X 20 `text`).
- **Corps** défilant, padding `6 16 16`, sections espacées de 20. Libellés en h6 (`overline`, `neutral500`, marge basse 8) :
  1. **TYPE** : Chips de 34 (padding 14) **Films**, **Séries**, **Animés**, sélection multiple (aucune = tous les types).
  2. **ACTEURS** : chips des acteurs choisis (`.tag-accent` de hauteur 28, 12 pt, X, gap 6 ; tap = retirer), puis un champ `.input` de 42, **« Ajouter un acteur ou une actrice »**. Autocomplétion après 2 caractères (`GET /search?type=person`, délai 300 ms) : liste sous le champ (marge haute 4, fond `neutral900`, rayon 8), 4 suggestions au maximum, lignes de hauteur min 40, padding 12, 14 pt, `neutral800` à la pression. Tap = ajouter et vider le champ. Avec plusieurs acteurs, on cherche les titres où ils jouent **ensemble** (ET).
  3. **GENRES** : Chips de 32, sélection multiple (OU). Liste : Action, Aventure, Comédie, Drame, Fantastique, Horreur, Science-fiction, Thriller, Animation, Documentaire (genres TMDB : films et séries ont des ids différents, à faire correspondre côté backend).
  4. **ANNÉES** : rangée `space-between` : libellé + valeur 13 `neutral300` « 1990 – 2026 ». Deux curseurs côte à côte (gap 12) : De (1950 → année courante, défaut 1990) et À (défaut année courante). De ≤ À est garanti (on borne à l'autre valeur). Utilise `@react-native-community/slider`, `minimumTrackTintColor accent`, `maximumTrackTintColor neutral800`, `thumbTintColor accent`.
  5. **NOTE IMDB MINIMALE** : libellé + valeur **« Toutes les notes »** (0) ou **« 7,5/10 minimum »** ; curseur 0 → 10, pas de 0,5.
  6. **DISPONIBLE SUR** : Chips **Toutes les plateformes** (défaut) · **Mes plateformes** (choix unique).
  7. Deux champs côte à côte (grille 1fr 1fr, gap 10), `.field > label` + sélecteur `.input` (ActionSheet) :
     - **Langue originale** : Toutes · Anglais · Français · Japonais · Coréen · Espagnol.
     - **Durée maximale** : Toutes · Moins de 1 h 30 · Moins de 2 h · Moins de 2 h 30 (s'applique à la durée des films et à la durée moyenne d'un épisode).
  8. **TRIER PAR** : Chips **Popularité** (défaut) · **Mieux notés** · **Plus récents** (choix unique).
- **Pied** (padding `10 16 34`) : bouton principal pleine largeur 50, 15 pt : **« Voir les {n} résultats »** si n > 1, **« Voir le résultat »** si n = 1, **« Aucun résultat »** (bouton désactivé, opacité 0.45) si n = 0. Le compteur se met à jour en direct à chaque changement de filtre (`GET /discover/count`, délai 250 ms). Tap → ferme la sheet et passe en mode « recherche avancée appliquée ».
- Les filtres sont conservés tant que l'écran de recherche est ouvert.

Correspondance API : `GET /discover?type=&genres=&cast=&yearFrom=&yearTo=&minRating=&providers=&lang=&maxRuntime=&sort=pop|rating|recent&page=`.

## 8.3 Découvrir (`/(tabs)/discover`)
- ScreenHeader **« Découvrir »** + loupe.
- UnderlineTabs **Films** · **Séries** · **Animés**.
- **Hors ligne** : à la place du contenu, état vide (padding `64 24`) : CloudSlash 40 · **« Découvrir est indisponible hors ligne »** 18/500 · **« Ta liste et À venir restent accessibles depuis le cache. »** 14 `neutral400`.
- **Carrousels** : chaque section a une marge haute de 20, un titre 18/500 (padding horizontal 16, marge basse 10) et un HorizontalCarousel d'affiches de 112 avec badge et « + » (20 titres, chargement paresseux). Une section vide n'est pas affichée.

| Onglet | Sections, dans l'ordre | Source |
|---|---|---|
| Films | **Tendances de la semaine** | `/trending/movie/week` (hors titres pas encore sortis) |
| | **Au cinéma** | `/movie/now_playing?region=` |
| | **Bientôt en salle** | `/movie/upcoming?region=` |
| | **Nouveautés sur mes plateformes** | `/discover/movie?with_watch_providers=mes ids&watch_region=&sort_by=primary_release_date.desc&with_watch_monetization_types=flatrate` |
| | **Les mieux notés** | `/discover/movie?sort_by=vote_average.desc&vote_count.gte=1000` |
| Séries | **Tendances** | `/trending/tv/week` (hors animés) |
| | **Nouvelles saisons cette semaine** | séries dont une saison a commencé dans les 7 derniers jours ou commence dans les 7 prochains (`/discover/tv?air_date.gte&air_date.lte`) |
| | **Populaires sur mes plateformes** | `/discover/tv?with_watch_providers=…&sort_by=popularity.desc` |
| | **Les mieux notés** | `/discover/tv?sort_by=vote_average.desc&vote_count.gte=500` |
| Animés | les 4 mêmes que Séries, filtrées sur les animés (`with_genres=16&with_origin_country=JP`) | idem |
| | **Animés de la saison en cours** | animés dont la saison est en cours de diffusion (première date ≤ aujourd'hui ≤ dernière date prévue) |

- **Par genre** (marge haute 28, padding horizontal 16) : titre **« Par genre »**, puis une grille de 2 colonnes (gap 8) de tuiles. Tuile : hauteur 60, rayon 12, dégradé `(index + 2) % 7`, texte 15/500 `text` aligné à gauche, padding horizontal 14 ; pression scale 0.98. Tap → `/genre/{type}/{genre}`. Les 10 genres listés plus haut, dans le même ordre.
- Données en cache 24 h (TanStack Query `staleTime`), rechargées au tirer-pour-rafraîchir.
