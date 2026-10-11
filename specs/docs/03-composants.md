# 03 — Composants

Toutes les mesures sont en pt. « Zone » = surface tactile, « visuel » = ce qui est dessiné. Chaque composant va dans `src/components/`.

---

## Poster (affiche)
Source : `reference/Poster.dc.html` et `A.pv()` dans `app.js`.

**Props**
```ts
type PosterProps = {
  title: Title;                 // id, title, posterPath?, type…
  showTitle?: boolean;          // false en mode compact (lignes 44 pt)
  badge?: { text: string; highlight?: boolean } | null;
  showAdd?: boolean;            // bouton + / coche
  inList: boolean;
  onPress?: () => void;         // par défaut : ouvrir la fiche
  onToggle?: () => void;        // par défaut : ajout/retrait rapide avec toast
  onLongPress?: () => void;     // Films de Ma liste uniquement
};
```
**Mise en page**
- Largeur imposée par le parent, `aspectRatio 2/3`, rayon 8, `overflow hidden`, bord 1 `neutral800`.
- **Image** : `expo-image`, `contentFit="cover"`, TMDB `w342` (grilles et carrousels) ou `w185` (compact). Fondu d'apparition 150 ms.
- **Remplacement** (pas d'image, ou en attendant le chargement) : dégradé `hash(id)`, plus :
  - une initiale décorative : 1er caractère du titre en majuscule, après avoir retiré un préfixe `L'`, `Le `, `La `, `Les `, `The `, `Une ` ; 76/600, interligne 1, `text`, opacité 0.08, position `right −4`, `top 14 %` ;
  - le titre (si `showTitle`) : 12/500, interligne 1.2, `text`, `left 8`, `right 34`, `bottom 8`, 3 lignes max.
- Quand une vraie image est affichée, ni initiale ni titre.
- **Badge** (si présent) : `top 6, left 6`, largeur max `100 % − 12`, padding 2/6, rayon 4, 10/500, une ligne avec points de suspension. Normal : fond `bgA80`, texte `text`. `highlight` (« Au cinéma ») : fond `accent800`, texte `accent100`.
- **Bouton +** (si `showAdd`) : zone 36 × 36 en `right 2, bottom 2`, visuel 26 :
  - hors liste : cercle `bgA75`, bord 1 `neutral600`, icône Plus 14 `text` ;
  - dans la liste : cercle `accent`, icône Check 14 bold `bg`, animation `pop` 300 ms au passage à l'état coché.
  - Le tap sur le bouton ne doit pas déclencher `onPress` de l'affiche, ni lancer l'appui long.
- **Pression** : scale 0.97 en 150 ms.
- **Appui long** (si `onLongPress`) : délai **480 ms**, haptique Medium, ouvre l'action sheet du film. Un tap qui suit un appui long ne doit pas ouvrir la fiche.
- Accessibilité : `accessibilityLabel = title`, et `"Ajouter " + title` / `"Retirer " + title` sur le bouton.

**Tailles utilisées**
| Contexte | Largeur | Titre | Badge | + |
|---|---|---|---|---|
| Grilles (3 colonnes, gap 8, marges 16) | (largeur − 32 − 16) / 3 ≈ 114,7 | oui | oui | oui |
| Carrousels Découvrir, Pas encore commencées | 112 | oui | oui | oui |
| Saga, Similaires | 104 | oui | oui | oui |
| En-tête de fiche | 104 | oui | non | non |
| Lignes compactes (À jour, Terminées, Abandonnées) | 44 | non | non | non |
| Onboarding étape 3 | grille | oui | non | oui (le tap sur l'affiche fait la même chose que le bouton) |

---

## CheckButton (coche d'épisode)
- Zone 44 × 44 (48 × 48 sur la carte « prochain épisode »), visuel centré 32 × 32, cercle.
- **Non vu** : bord 1.5 `neutral600`, fond transparent, icône Check 16 `neutral600` (`neutral500` sur la carte).
- **Vu** : fond `accent`, icône Check 17 bold `bg`.
- Passage à vu : animation `pop` 350 ms + `Haptics.impactAsync(Light)`.
- Libellé d'accessibilité : « Marquer comme vu » / « Marquer comme non vu ».
- Absent pour un épisode pas encore diffusé.

---

## NextEpisodeCard (carte « prochain épisode »)
Utilisée dans Ma liste › Séries/Animés, sections « À regarder » et « Pas regardé depuis un moment ».

**Structure** (de l'arrière vers l'avant)
1. Conteneur : rayon 12, `overflow hidden`, fond `neutral900`.
2. Actions cachées, à droite, largeur **150**, deux boutons de 75 sur toute la hauteur, colonne centrée, gap 4, texte 12 `text`, icône 20 :
   - **Abandonner** : fond `neutral800`, icône PauseCircle → statut `abandoned`, toast « Série abandonnée » + Annuler.
   - **Retirer** : fond `neutral700`, icône Trash → retire le titre, toast « Retirée de ma liste » + Annuler.
3. Face avant (glissable) : rangée, centrée verticalement, gap 12, padding `10 4 12 10`, fond `surface`.
   - Vignette 96 × 58, rayon 6 : image TMDB `still` (w300) de l'épisode, sinon dégradé `hash(id + s + '-' + e)` ; agrandie à 1.15 pour que le flou anti-spoiler ne laisse pas de bord ; flou 6 si anti-spoiler.
   - Colonne de texte (flex 1, min 0) :
     - nom de la série 15/500 `text`, 1 ligne ;
     - `S{ss} E{ee} · {titre}` 13 `neutral300`, 1 ligne (titre = `Épisode {n}` si anti-spoiler) ;
     - restants 12 `neutral500`, marge haute 2.
   - CheckButton (zone 48), état non vu.
   - Barre de progression : absolue `left 0, bottom 0`, hauteur 2, fond `accent`, largeur `pct %`, transition 300 ms.

**Interactions**
- Tap sur la carte → fiche série, onglet Épisodes, saison du prochain épisode.
- Tap sur la coche → marque l'épisode vu (sans dialogue), toast « Épisode marqué comme vu » + Annuler, la carte affiche aussitôt l'épisode suivant avec l'animation `cardIn` sur la colonne de texte. S'il ne reste rien, la série change de section.
- **Swipe** (gesture-handler `Pan`, `activeOffsetX [-8, 8]`, `failOffsetY [-10, 10]` pour laisser défiler la liste) :
  - translation bornée à `[−170, 0]`, partant de 0 ou de −150 si la carte est déjà ouverte ;
  - au relâcher : si translation < −60, la carte reste ouverte à **−150** ; sinon elle revient à 0 (250 ms ease) ;
  - **une seule carte ouverte à la fois** ; ouvrir une carte referme l'autre ; changer d'onglet ou de tab les referme toutes ;
  - tap sur une carte ouverte → la referme (n'ouvre pas la fiche) ;
  - un glissement ne doit jamais déclencher le tap.

---

## UnderlineTabs (onglets soulignés)
- Rangée, gap 22 (20 dans la recherche, où la rangée défile horizontalement), padding horizontal 16.
- Onglet : padding vertical 10, texte 15/500 (14/500 dans la recherche). Actif : `text`. Inactif : `neutral500`.
- Soulignement : absolu en bas, toute la largeur du libellé, hauteur 3, rayon 3, `accent` si actif, sinon transparent.
- Changement instantané.

## Chip (filtre)
- Hauteur 32 (34 pour « Type » dans la recherche avancée, 28 pour le tri d'une personne), padding horizontal 12 (14 pour À venir et les saisons), rayon 999, bord 1, texte 13 (12 pour la variante 28), une ligne.
- Inactive : bord `neutral800`, fond transparent, texte `neutral300`.
- Active : bord `accent`, fond `accent900`, texte `accent200`.
- Rangées de chips : gap 8 ; défilement horizontal sans barre quand elles débordent (Ma liste, À venir, saisons), retour à la ligne sinon (recherche avancée).

## Segmented (contrôle segmenté À voir | Vus)
Classe `.seg`. Deux options « À voir » et « Vus ». Bord 1 `divider`, rayon 8. Option : padding 7/12, 13 pt ; séparateur 1 `divider`. Sélectionnée : texte `accent`, contour intérieur 1 `accent`. Non sélectionnée pressée : fond `textA07`.

## Switch (interrupteur)
- Piste 44 × 26, rayon 999. Active : `accent`. Inactive : `neutral800`.
- Poignée 22 × 22, `top 2`, `left 2` (inactif) ou `20` (actif). Fond `bg` si actif, `neutral400` si inactif.
- Transition 200 ms. `accessibilityRole="switch"`.
- N'utilise pas le Switch natif : il ne correspond pas au visuel.

## Button (`.btn`)
Variantes `primary | secondary | ghost | icon`. Toujours avec une hauteur explicite :
| Contexte | Hauteur | Texte |
|---|---|---|
| CTA plein écran (connexion, onboarding, notifications, « Voir les N résultats ») | 50 | 15/500 |
| Fiche épisode | 48 | 15/500 |
| Actions de fiche (« Ajouter à ma liste », « Marquer comme vu », « Suivre ») | 46 | 14/500, icône 18 |
| Se déconnecter, Annuler d'une action sheet | 46 | 14/500 |
| CTA d'état vide, « Plus tard » | 44 | 14/500 |
| Dialogue | 42 | 14/500 |
| « Commencer » sous une affiche | 34 | 13/500 |
| « Voir plus » | 32 | 14/500, ghost, décalé de −4 à gauche |

## RatingChips
Rangée qui revient à la ligne, gap 8, padding `16 16 0`.
- **IMDb** : hauteur 32, rayon 999, fond `surface`, padding `0 12 0 5`, gap 8 : badge « IMDb » (padding 2/5, rayon 4, fond `neutral200`, texte 11/700 `bg`) · note `8,5/10` 13/500 · votes `640 k votes` 12 `neutral500`.
- **Rotten Tomatoes** : hauteur 32, rayon 999, fond `surface`, padding `0 12 0 8`, gap 6 : icône Smiley fill (≥ 60 %) ou SmileySad fill (< 60 %) 18 `accent300` · « Rotten Tomatoes » 11 `neutral400` · `92 %` 13/500.
- Une chip est masquée si sa note manque. Format des nombres : virgule décimale fr-CA (`8,5`), espace insécable avant `%`.

## ProviderLogo
- Bouton colonne, largeur 64, gap 4.
- Pastille 40 × 40 (36 dans la sheet des plateformes, 44 dans l'onboarding), cercle, fond `neutral800`, anneau `0 0 0 1.5` (`borderWidth 1.5`) `accent` si c'est une de mes plateformes, sinon `neutral700` (fiches seulement). Contenu : logo TMDB (`w92`), sinon l'abréviation 12/600 (N, pv, D+, C, tv, CR, P+, TOU).
- Nom 11 `neutral400` centré.
- Tap → ouvre le lien du fournisseur (`watch/providers.link` de TMDB pour la région) avec `Linking.openURL`, et affiche le toast « Ouverture de {plateforme}… ».

## SectionHeader repliable
Bouton pleine largeur, hauteur min 44, padding horizontal 16, gap 8 : titre 18/500 · compteur 13 `neutral500` · icône CaretUp (ouvert) / CaretDown (fermé) 16 `neutral500` poussée à droite. Marge haute de la section : 14.

## ScreenHeader
- Rangée `space-between`, centrée, padding `8 8 0 16`.
- Titre 28/500.
- Bouton recherche (Ma liste et Découvrir) : ghost icône, 44 × 44, MagnifyingGlass 22 `text`.
- À venir et Profil : pas de bouton, hauteur 52, padding `8 16 0`.

## TabBar
- Hauteur 84 dont **26 de zone sûre basse** (utilise `useSafeAreaInsets().bottom`, au moins 26), padding `6 8`, fond `bg`, filet haut 1 `neutral900`.
- 4 items de même largeur, colonne centrée, gap 3 : icône 24 (fill si actif), libellé 11.
- Actif : `accent`. Inactif : `neutral500`.
- Libellés et ordre : **Ma liste**, **Découvrir**, **À venir**, **Profil**.
- Re-taper l'onglet actif remonte la liste en haut.
- La tab bar est masquée sous les fiches et la recherche, qui s'empilent par-dessus.

## RoundIconButton (sur image)
40 × 40, cercle, fond `bgA60`, icône 20 `text` (22 pour DotsThree). Utilisé en haut des fiches : `top = insets.top + 3` (50 dans le prototype), `left/right 12`, gap 8 entre les boutons de droite.

## BottomSheet
Implémentation maison (Modal transparent + Reanimated), pas de bibliothèque de sheet : le visuel doit être exact.
- Scrim plein écran `scrim`, fondu 200 ms ; tap → ferme.
- Panneau collé en bas, fond `surface`, rayon `14 14 0 0`, `shadowLg`, entrée `sheet`.
- Fermeture : par le scrim, un bouton, ou un glissement vers le bas (> 80 pt ou vitesse > 800) ; sortie en 200 ms.
- Variantes :
  - **ActionSheet** : padding `8 8 34`. Poignée 36 × 4, rayon 4, `neutral700`, centrée, marge basse 10. Titre 13 `neutral400`, padding `0 12 8`. Options : hauteur min 50, padding horizontal 12, rayon 8, gap 12, icône 20 `neutral400` + libellé 15 `text` ; pressé : fond `neutral800`. Puis un bouton secondaire « Annuler », pleine largeur, hauteur 46, marge haute 8. Choisir une option ferme la sheet **puis** exécute l'action.
  - **EpisodeSheet**, **PlatformsSheet**, **AdvancedSearchSheet** : voir les écrans.

## Dialog
- Scrim `scrim`, fondu 200 ms, contenu centré, padding 11.2.
- Boîte `.dialog` (voir tokens). Titre, corps facultatif, actions alignées à droite (boutons de 42).
- Tap sur une action → ferme **puis** exécute. Pas de fermeture par le scrim.
- Au-dessus de tout (z-index le plus haut, y compris au-dessus des sheets).

## Toast
- Position absolue `left 16, right 16`, `bottom 96` quand la tab bar est visible, sinon `bottom 34` (+ zone sûre).
- Hauteur min 48, padding `4 6 4 16`, rayon 12, fond `neutral800`, `shadowMd`, rangée centrée, gap 12, entrée `up` 250 ms.
- Message 14 `text`, flex 1. Bouton ghost « Annuler » facultatif, hauteur 40, padding horizontal 12, texte `accent300`.
- Durée **5 000 ms**. Un nouveau toast remplace le précédent et relance le minuteur.
- « Annuler » restaure l'état d'avant l'action (instantané `my` + `episodes`), puis masque le toast.

## Skeleton
- Fond = dégradé `shimmer` animé. Formes : affiche (2:3, rayon 8), carte (hauteur 80, rayon 12), ligne de recherche (rectangle 40 × 60 rayon 6 + barre de hauteur 14 rayon 4, flex 1, gap 12).
- Ma liste › Films : 9 affiches en grille. Séries/Animés : 3 cartes (gap 8, padding `20 16 0`). Recherche : 3 lignes (gap 10, padding `12 16`).

## EmptyState
Colonne alignée à gauche, padding `64 24` (48 dans À venir), gap 8 : icône 40 `neutral600` · titre 18/500 · texte facultatif 14 `neutral400` · bouton principal hauteur 44, marge haute 8.

## OfflineBanner
Sous la barre d'état, hauteur 28, fond `neutral900`, texte 12 `neutral300`, centré, gap 6 : CloudSlash + « Hors ligne · affichage depuis le cache ». Visible dans les onglets quand `NetInfo.isConnected === false`.

## PosterGrid
3 colonnes `minmax(0,1fr)`, gap 8, padding horizontal 16. Utilise `FlatList` avec `numColumns={3}` et `columnWrapperStyle={{ gap: 8 }}`. Pas de séparateur.

## HorizontalCarousel
`FlatList` horizontale, `showsHorizontalScrollIndicator={false}`, padding horizontal 16, gap 10 (12 pour le casting). Pas de pagination magnétique.
