# 07 — Fiches

Référence : prototype, blocs `ovTitle`, `ovActor`, `ovList`, `epOpen`, et `vals()` › overlays dans `app.js`.

## 7.1 Fiche titre (`/title/[type]/[id]`) — structure commune film / série / animé
Écran plein, fond `bg`, défilement vertical (padding bas 48). La tab bar est cachée.

### En-tête
1. **Backdrop** : hauteur 250, pleine largeur, sous la barre d'état. Image TMDB `backdrop_path` (`w780`), sinon dégradé `hash(id)`. Par-dessus, un voile dégradé vertical de `bgA25` (haut) à `bg` (bas).
2. **Boutons** (RoundIconButton, `top insets.top + 3`, `left/right 12`) :
   - gauche : CaretLeft → retour ;
   - droite (gap 8) : cloche (BellRinging si les alertes sont actives, BellSlash sinon) ; pour les séries/animés, en plus, DotsThree → ActionSheet série.
   - Cloche : bascule `user_titles.notifications_enabled` (ou l'enregistre en préférence locale si le titre n'est pas dans la liste) ; toast **« Alertes coupées pour ce titre »** / **« Alertes activées pour ce titre »**, sans Annuler.
3. **Bloc titre** : rangée alignée en bas, gap 14, padding horizontal 16, `marginTop −120` (chevauche le backdrop) :
   - Poster 104 (sans badge, sans « + », non cliquable) ;
   - colonne : titre 24/500 (marge basse 6, `textBreakStrategy` équilibré) · méta 13 `neutral300` · genres 13 `neutral500`, séparés par « , », marge haute 2.
   - Méta film : `{année} · {durée} · {classification}`, en omettant les valeurs absentes. Durée : `2 h 46`, `45 min`.
   - Méta série : `{année de début} · {plateforme ou chaîne} · {statut}` avec statut ∈ **En cours**, **Terminée**, **Annulée**.
4. **RatingChips** (padding `16 16 0`).
5. Série/animé seulement, s'il y a un prochain épisode daté : texte 14 `accent300`, padding `12 16 0` : **« Prochain épisode : S03 E04 le 14 oct. »**
6. **Actions** (rangée gap 8, padding `16 16 0`, boutons flex 1, hauteur 46, icône 18) :
   - **Film** :
     - principal : **« Ajouter à ma liste »** (Plus) ↔ **« Dans ma liste »** (Check). Tap = bascule avec toast **« Ajouté à ma liste »** / **« Retiré de ma liste »** + Annuler ;
     - secondaire : **« Marquer comme vu »** (Eye) ↔ **« Vu »** (Eye fill). Tap = bascule, toast **« Marqué comme vu »** / **« Remis dans À voir »** + Annuler, haptique au passage à vu.
   - **Série/animé** : un seul bouton principal :
     - hors liste : **« Suivre »** (Plus) → suit, toast **« Série suivie »** + Annuler ;
     - suivie : **« Suivie »** (Check) ; abandonnée : **« Abandonnée »** (PauseCircle). Dans ces deux cas, le tap ouvre l'ActionSheet série.
7. **Film seulement — bandeau de statut** : marge `12 16 0`, padding `12 14`, rayon 12, fond `accent900`, texte 14 `accent200`, rangée gap 10, icône 18. Textes et icônes : `01-produit-et-regles.md` §5.
8. **Série/animé seulement — UnderlineTabs** (padding `12 16 0`) : **Épisodes** (défaut) · **Infos**.

### ActionSheet série (« … » ou bouton Suivie/Abandonnée)
Titre = nom de la série. Options selon l'état :
| État | Options |
|---|---|
| Suivie | **Abandonner** (PauseCircle) · **Ne plus suivre** (Trash) · **Couper les alertes** (BellSlash) / **Activer les alertes** (BellRinging) |
| Abandonnée | **Reprendre le suivi** (PlayCircle) · **Ne plus suivre** · alertes |
| Hors liste | **Suivre** (Plus) · alertes |
Toasts : « Série abandonnée », « Suivi repris », « Série retirée » (avec Annuler).

### Contenu « Infos »
Affiché tout de suite sous l'en-tête pour un film, et dans l'onglet Infos pour une série. Sections dans cet ordre (padding `24 16 0`, titre 18/500, marge basse 10, ou 8 pour Synopsis, Équipe et Infos) :

1. **Où regarder**
   - Groupes **Abonnement**, **Location**, **Achat** (seulement ceux qui ont des offres), colonne gap 12. Libellé 12 `neutral500`, marge basse 6. Puis une rangée de ProviderLogo (gap 14, retour à la ligne), **mes plateformes en premier**.
   - Aucune offre : **« Disponibilité inconnue pour ta région. »** 14 `neutral400`.
   - Mention 11 `neutral500`, marge haute 10 : **« Données JustWatch · tes plateformes sont cerclées »**.
2. **Synopsis** : texte 15 `neutral300`, 3 lignes (`numberOfLines={3}`) ; bouton ghost 32 **« Voir plus »** ↔ **« Voir moins »** (le bouton est masqué si le texte tient en 3 lignes : mesure avec `onTextLayout`).
3. **Bande-annonce** (padding `16 16 0`) : bouton 16:9, rayon 12, fond = image du backdrop (sinon le dégradé). Au centre : cercle 56, bord 1 `accent`, fond `bgA60`, Play fill 22 `accent`. En bas à gauche (`left 12, bottom 10`) : **« Bande-annonce · YouTube »** 13 `text`. Section masquée si TMDB n'a pas de vidéo `type=Trailer, site=YouTube` (d'abord dans la langue de l'utilisateur, sinon en anglais).
4. **Casting** (titre avec padding horizontal 16) : HorizontalCarousel gap 12, les 15 premiers membres. Élément : largeur 76, colonne gap 6, photo ronde 64 (TMDB `profile_path` `w185`, sinon dégradé `hash(nom)` + initiales 18/500), nom 12/500 centré (interligne 1.2), rôle 11 `neutral500` centré. Tap → fiche personne. Section masquée si le casting est vide.
5. **Équipe** (film) : lignes **Réalisation**, **Scénario**. **Créateurs** (série) : lignes **Création**, **Diffusion**. Ligne : rangée gap 12, padding vertical 6, 14 pt ; clé de largeur 120 `neutral500` ; valeur `text`.
6. **Infos** (padding `16 16 0`) :
   - Film : **Titre original**, **Sortie ({Région})** (ex. « Sortie (Canada) » → « 18 décembre 2026 »), **Langue originale**, **Pays**, **Studio**.
   - Série : **Titre original**, **Genres**, **Saisons** (« 4 saisons · 38 épisodes »), **Langue originale**, **Pays**.
7. **Saga** (film d'une collection TMDB) : carrousel d'affiches 104 des autres volets, triés par date.
8. **Titres similaires** : carrousel d'affiches 104 avec « + » (TMDB `recommendations`, puis `similar` en complément ; 8 au maximum ; même type).

### Onglet « Épisodes » (série/animé)
1. **Sélecteur de saisons** : Chips défilantes (gap 8, padding `14 16 0`, padding horizontal 14) **Saison 1**, **Saison 2**… et **Spéciaux** en dernier si une saison 0 existe. Saison par défaut : celle du prochain épisode, sinon celle du prochain épisode à venir, sinon la dernière (ou la saison passée en paramètre de route).
2. **En-tête de saison** : marge `14 16 0`, padding `12 14`, rayon 12, fond `surface`, rangée gap 12 :
   - colonne flex : « Saison {n} » 15/500 · « {vus}/{total} vus » 13 `neutral400` · barre (hauteur 3, rayon 3, piste `neutral800`, remplissage `accent` à `vus/total`, marge haute 8, transition 300 ms). Le total compte **tous** les épisodes de la saison, diffusés ou non ;
   - bouton (si au moins un épisode diffusé) : hauteur 40, padding 12, rayon 999, bord 1 `accent`, 13/500, icône Checks 18, gap 6 :
     - **« Tout marquer comme vu »** : fond transparent, texte `accent` → coche les épisodes diffusés non vus (toast « {n} épisodes marqués comme vus » + Annuler) ;
     - **« Saison vue »** (tous les épisodes diffusés sont vus) : fond `accent`, texte `bg` → décoche toute la saison (toast « Saison décochée » + Annuler).
3. **Liste d'épisodes** (padding `6 16 0`) : ligne en rangée gap 12, padding vertical 8 :
   - vignette 96 × 54, rayon 6 (TMDB `still_path` `w300`, sinon dégradé `hash(id+s+'-'+e)`), agrandie à 1.15, floutée 6 si anti-spoiler et non vu ;
   - colonne : `E05 · Titre` 14/500 (1 ligne), méta 12 `neutral500`, marge haute 2 :
     - diffusé : `{d MMMM yyyy} · {durée}`, ex. « 3 octobre 2026 · 32 min » ;
     - non diffusé : `{Aujourd'hui | Demain | ven. 16 oct.} · {heure locale}`, ex. « Demain · 21 h 00 » ;
   - CheckButton (zone 44) si diffusé.
   - Non diffusé : opacité 0.45 sur toute la ligne, pas de coche.
   - Tap sur la ligne → EpisodeSheet. Tap sur la coche → règles du §4 de `01-produit-et-regles.md` (dialogue des épisodes précédents, décochage).
4. Anti-spoiler : titre « Épisode {n} » pour chaque épisode non vu.

## 7.2 EpisodeSheet (fiche épisode)
BottomSheet (entrée 250 ms), fond `surface`, rayon `14 14 0 0`, `overflow hidden`.
- Image 180 de haut, pleine largeur (`still_path` `w780` ou dégradé), agrandie à 1.1, floutée 10 si anti-spoiler et non vu.
- Bouton fermer : `top 10, right 10`, rond 36, fond `bgA60`, X 16.
- Contenu : padding `16 16 34`, colonne gap 8 :
  - `S03 E04 · {Série}` 12 `accent300` ;
  - titre 22/500 ;
  - méta 13 `neutral400` : diffusé `{d MMMM yyyy} · {durée}`, à venir `{jour} · {heure} · {durée}` ;
  - si diffusé et noté : badge IMDb + note de l'épisode `7,8/10` 13/500 (OMDb) ;
  - synopsis 14 `neutral300` (marge `4 0 8`), ou le texte anti-spoiler ;
  - diffusé : bouton hauteur 48, 15 pt, **« Marquer comme vu »** (principal, icône Eye) ↔ **« Vu »** (secondaire, icône Check). Même logique que la coche, dialogue compris ;
  - non diffusé : **« Pas encore diffusé. »** 13 `neutral500`.
- Le dialogue des épisodes précédents s'affiche **au-dessus** de la sheet.

## 7.3 Fiche personne (`/person/[id]`)
Entrée `push`. Padding haut = zone sûre.
- Barre : CaretLeft (ghost 44, icône 22) → retour.
- Contenu défilant, padding `0 16 40` :
  - rangée gap 16 : photo ronde 96 (`profile_path` `w185`, sinon dégradé `hash(nom)` + initiales 30/500) ; colonne : nom 24/500 (marge basse 4) et naissance 13 `neutral400` : **« Né le 27 décembre 1995 à New York, États-Unis »** / **« Née le … »** selon `gender` TMDB (1 = femme) ; genre inconnu : « Né·e le … » ; données absentes : **« Date et lieu de naissance non renseignés »** ;
  - biographie (TMDB `biography`, dans la langue choisie, sinon en anglais) : 14 `neutral300`, marge haute 16, 2 lignes + bouton ghost 32 **« Voir plus » / « Voir moins »**. Sans biographie, texte généré : « {Nom} est connu·e pour {titre 1} ({rôle}), {titre 2} ({rôle})… » ;
  - **« Filmographie »** 18/500, marge haute 16 ;
  - rangée `space-between` : UnderlineTabs **Films** · **Séries** (Séries regroupe séries et animés) ; Chips de 28 **Popularité** (défaut) · **Plus récent** (gap 6) ;
  - PosterGrid (marge haute 12) d'affiches avec badge et « + » (coché si le titre est dans ma liste) ;
  - vide : **« Aucun titre dans cette catégorie. »** 14 `neutral400`, padding vertical 24.
- Données : TMDB `person/{id}` + `combined_credits` (cast), sans doublon. Popularité = `popularity` décroissante ; Plus récent = date décroissante.

## 7.4 Liste par genre (`/genre/[type]/[genre]`)
- Barre : CaretLeft + colonne : nom du genre 18/500 · « {n} films | séries | animés » 12 `neutral500`.
- PosterGrid, padding `8 16 40`, chargement infini (pages de 20, `onEndReached`), avec badge et « + ».
- Données : `GET /discover?type=…&genres={id}&sort=pop` (mêmes paramètres que la recherche avancée).
- Vide : FilmStrip 40 + **« Aucun titre dans ce genre pour l'instant »** 16/500.
