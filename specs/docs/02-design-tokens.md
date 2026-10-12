# 02 — Design tokens

Système : **Nocturne** (`reference/styles.css`). Thème sombre uniquement. Unité : point (pt = px CSS du prototype, à 390 pt de large).

Crée `src/theme/tokens.ts` avec **exactement** ces valeurs.

## 1. Couleurs

### Rôles
| Token | Hex | Usage |
|---|---|---|
| `bg` | `#161826` | fond de tous les écrans, texte posé sur l'accent |
| `surface` | `#232532` | cartes, bottom sheets, dialogues, lignes de réglages, champs |
| `text` | `#e9e9ed` | texte principal, titres |
| `accent` | `#9184d9` | contours des boutons principaux, onglet actif, coches validées, barres de progression, interrupteurs actifs |
| `accent2` | `#a7a1db` | inutilisé (gamme mono) |
| `divider` | `rgba(233,233,237,0.16)` | contour des boutons secondaires, des champs et du contrôle segmenté |

### Gamme neutre
| Token | Hex | Usage dans l'app |
|---|---|---|
| `neutral100` | `#f3f5fe` | texte des tags neutres |
| `neutral200` | `#e4e7f5` | fond du badge « IMDb » |
| `neutral300` | `#cfd3e5` | texte secondaire fort (méta des fiches, code épisode, synopsis), cadre de l'indicateur d'accueil |
| `neutral400` | `#b2b6ca` | descriptions, libellés de ligne, icônes de réglages, poignée d'interrupteur inactif |
| `neutral500` | `#9397ab` | métadonnées faibles, onglets inactifs, en-têtes de section h6 |
| `neutral600` | `#75798c` | contour des coches vides, chevrons, icônes d'état vide |
| `neutral700` | `#595d6c` | anneau des plateformes non choisies, poignée de sheet, bouton « Retirer » du swipe |
| `neutral800` | `#3f424d` | contour des chips inactives, fond des pastilles de plateformes, piste d'interrupteur inactif, piste de progression, fond des toasts, bouton « Abandonner » du swipe |
| `neutral900` | `#292b31` | séparateurs entre lignes de réglages, fond derrière les cartes swipables, bandeau hors ligne, squelettes |

### Gamme accent
| Token | Hex | Usage |
|---|---|---|
| `accent100` | `#f5f4ff` | texte du badge « Au cinéma », initiale de l'avatar |
| `accent200` | `#e7e5fe` | texte des chips actives, du jour courant et du bandeau de statut |
| `accent300` | `#d2cefd` | texte accentué de petite taille (lien « Annuler » des toasts, libellés de jour, prochain épisode, compteurs), icône Rotten Tomatoes |
| `accent400` | `#b5abfc` | état pressé (dark) |
| `accent500` | `#968ae0` | — |
| `accent600` | `#796cbf` | dégradé d'affiche n° 7 |
| `accent700` | `#5d5294` | dégradé d'affiche n° 1 |
| `accent800` | `#423a6a` | fond du badge « Au cinéma », fond de l'avatar, fond des tags accent |
| `accent900` | `#2b2741` | fond des chips actives, des tuiles de plateforme sélectionnées, du jour courant, du bandeau de statut, de l'icône de l'écran notifications |

### Section (fonds saturés, pour les dégradés d'affiches uniquement)
`section #262a60` · `sectionGlow #353b80` · `sectionGhost #4c5397`

### Transparences pré-calculées (React Native n'a pas `color-mix`)
| Token | Valeur | Usage |
|---|---|---|
| `bgA80` | `rgba(22,24,38,0.80)` | fond des badges d'affiche |
| `bgA75` | `rgba(22,24,38,0.75)` | fond du bouton « + » non coché |
| `bgA60` | `rgba(22,24,38,0.60)` | boutons ronds posés sur une image (retour, cloche, menu, fermer, lecture) |
| `bgA25` | `rgba(22,24,38,0.25)` | haut du dégradé du backdrop |
| `bgA20` | `rgba(22,24,38,0.20)` | haut du dégradé de l'écran de connexion |
| `scrim` | `rgba(41,43,49,0.60)` | fond derrière les sheets et les dialogues |
| `accentA12` | `rgba(145,132,217,0.12)` | survol/pression du bouton principal |
| `accentA22` | `rgba(145,132,217,0.22)` | pressé du bouton principal |
| `accentA10` | `rgba(145,132,217,0.10)` | pressé du bouton ghost |
| `accentA35` | `rgba(145,132,217,0.35)` | halo du logo (ombre floue 24 pt) |
| `textA07` | `rgba(233,233,237,0.07)` | pressé du bouton secondaire |
| `textA14` | `rgba(233,233,237,0.14)` | pressé fort du bouton secondaire |
| `textA70` | `rgba(233,233,237,0.70)` | libellé au-dessus d'un champ (`.field > label`) |

### Correspondance avec la spec PDF (pour information)
| Spec PDF | Remplacé par |
|---|---|
| background `#0E0E10` | `bg #161826` |
| surface `#1A1A1D` | `surface #232532` |
| surface-2 `#26262B` | `neutral800` / `neutral900` |
| accent `#FFD000` | `accent #9184d9` |
| on-accent `#0E0E10` | `bg #161826` |
| text-primary `#FFFFFF` | `text #e9e9ed` |
| text-secondary `#A0A0A8` | `neutral400` / `neutral500` |
| danger `#E5484D` | pas de rouge : actions destructives en neutre (voir composants) |
| success `#3DD68C` | badge « Au cinéma » en accent800/accent100 |

## 2. Dégradés d'affiches de remplacement
7 dégradés linéaires. L'index est `hash(clé) % 7`, avec :
```ts
function hash(s: string): number { let h = 7; for (const ch of s) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0; return h; }
```
> Remarque : le prototype calcule `(a*31+c)>>>0` avec des flottants JS. Pour garder exactement les mêmes couleurs que le prototype, utilise `h = ((h * 31) + c) >>> 0` (et non `Math.imul`) : les deux donnent le même résultat tant que `h*31 < 2^53`, ce qui est toujours le cas ici.

Clés : `title.id` (affiche, backdrop, bande-annonce), le nom de la personne (avatar), `title.id + saison + '-' + épisode` (vignette d'épisode). Dans l'app, `title.id` = `"{media_type}-{tmdb_id}"`.

| # | Angle CSS | Début → Fin |
|---|---|---|
| 0 | 160° | `accent700 #5d5294` → `neutral900 #292b31` |
| 1 | 160° | `sectionGhost #4c5397` → `section #262a60` |
| 2 | 160° | `neutral700 #595d6c` → `neutral900 #292b31` |
| 3 | 160° | `accent800 #423a6a` → `bg #161826` |
| 4 | 160° | `sectionGlow #353b80` → `neutral900 #292b31` |
| 5 | 160° | `neutral600 #75798c` → `accent900 #2b2741` |
| 6 | 200° | `accent600 #796cbf` → `section #262a60` |

Avec `expo-linear-gradient`, 160° CSS correspond à `start={{x:0.33,y:0}} end={{x:0.67,y:1}}` et 200° à `start={{x:0.67,y:0}} end={{x:0.33,y:1}}`.

Tuiles de genre (Découvrir) : dégradé `(index + 2) % 7`, dans l'ordre de la liste des genres.

## 3. Typographie
Police unique **Inter** (`Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold`).
Corps par défaut : 15 pt, interligne 1.55, graisse 400, couleur `text`.
Titres (h1–h6) : graisse 500, interligne 1.12, `letterSpacing = -0.015 × taille`.

| Style | Taille | Graisse | Interligne | Autre | Usage |
|---|---|---|---|---|---|
| `display` | 34 | 500 | 1.10 | ls -0.51 | accroche de la connexion |
| `h1Notif` | 30 | 500 | 1.12 | ls -0.45 | titre de l'écran notifications |
| `screenTitle` | 28 | 500 | 1.12 | ls -0.42 | titres d'écran (Ma liste, Découvrir, À venir, Profil, onboarding) |
| `titleXL` | 24 | 500 | 1.12 | ls -0.36 | titre de fiche, nom de personne |
| `sheetTitle` | 22 | 500 | 1.12 | ls -0.33 | titre de la fiche épisode |
| `dialogTitle` | 20 | 500 | 1.2 | — | titre de dialogue, nom de l'app « Suivi » |
| `section` | 18 | 500 | 1.12 | ls -0.27 | titres de section, en-têtes repliables, titre de sheet |
| `name` | 17 | 500 | 1.3 | — | nom dans Profil |
| `bodyStrong` | 15 | 500 | 1.3 | — | titres de ligne et de carte, onglets |
| `body` | 15 | 400 | 1.55 | — | paragraphes, synopsis |
| `label` | 14 | 400/500 | 1.4 | — | lignes de réglages, contenu des toasts, boutons (`.btn` = 14/500) |
| `meta` | 13 | 400 | 1.4 | — | métadonnées, chips, sous-titres |
| `small` | 12 | 400/500 | 1.3 | — | méta d'épisode, libellés de champ, noms de plateforme |
| `tiny` | 11 | 400 | 1.3 | — | libellés de la tab bar, rôles du casting, jours de la semaine |
| `micro` | 10 | 500 | 1.2 | — | badges d'affiche |
| `overline` | 13 | 500 | 1.12 | uppercase, ls 1.04 (0.08em) | h6 : « PRÉFÉRENCES », « RECHERCHES RÉCENTES »… couleur `neutral500` |

Titre posé sur une affiche de remplacement : 12/500, interligne 1.2.

## 4. Espacements
Le prototype utilise des valeurs en pt explicites, presque toutes multiples de 2. Retiens :
- Marge latérale des écrans : **16**.
- Espace entre affiches d'une grille : **8** ; entre affiches d'un carrousel : **10**.
- Espace vertical entre sections de fiche : **24** ; entre sections de Découvrir : **20** (28 avant « Par genre »).
- Espace entre cartes « prochain épisode » : **8** ; entre éléments d'À venir : **6**.
- Échelle Nocturne (utilisée par `.btn`, `.dialog`, `.card`) : `s1 2.8 · s2 5.6 · s3 8.4 · s4 11.2 · s6 16.8 · s8 22.4`.

## 5. Rayons
| Token | Valeur | Usage |
|---|---|---|
| `rXs` | 4 | badges d'affiche, badge IMDb, barres de progression (3–4) |
| `rSm` | 6 | vignettes d'épisode, mini-affiches 40 × 60, tags (`.tag` = 6) |
| `rMd` | 8 | affiches, boutons `.btn`, champs `.input`, contrôle segmenté |
| `rLg` | 12 | cartes, lignes d'À venir, groupes de réglages, bandeau de statut, tuiles, toasts, bande-annonce |
| `rXl` | 14 | haut des bottom sheets, dialogues |
| `rPill` | 999 | chips, interrupteurs, chips de notes, bouton « Tout marquer comme vu » |
| cercle | 50 % | coches, boutons ronds, avatars, pastilles de plateformes |

## 6. Ombres (élévation)
| Token | CSS | React Native |
|---|---|---|
| `shadowSm` | `0 0 0 1px #3f424d` | `borderWidth: 1, borderColor: neutral800` (contour intérieur, pas d'ombre) |
| `shadowMd` | `0 0 0 1px #595d6c, 0 6px 18px rgba(0,0,0,.55)` | bord 1 `neutral700` + `shadowColor #000, opacity .55, radius 9, offset {0,6}`, `elevation 8` |
| `shadowLg` | `0 0 0 1px #9397ab, 0 16px 40px rgba(0,0,0,.65)` | bord 1 `neutral500` + `shadowColor #000, opacity .65, radius 20, offset {0,16}`, `elevation 16` |

`shadowSm` : affiches. `shadowMd` : toasts. `shadowLg` : sheets et dialogues.

## 7. Animations
| Nom | Effet | Durée / courbe | Usage |
|---|---|---|---|
| `push` | translateX 40 → 0, opacité 0 → 1 | 220 ms, ease | ouverture d'une fiche, d'une personne, d'une liste de genre |
| `fade` | opacité 0 → 1 | 180 ms (recherche), 200 ms (scrims), 300 ms (onboarding, notifications) | — |
| `sheet` | translateY 100 % → 0 | 220 ms (action sheet), 250 ms (épisode, plateformes), 280 ms (recherche avancée), ease | bottom sheets |
| `up` | translateY 12 → 0, opacité 0 → 1 | 250 ms, ease | apparition du toast |
| `cardIn` | translateY 8 → 0, opacité 0 → 1 | 400 ms, ease | texte de la carte « prochain épisode » après une coche (rejouée à chaque coche) |
| `pop` | scale 1 → 1.25 (40 %) → 1 | 350 ms (coche épisode), 300 ms (« + » d'affiche) | validation |
| `shimmer` | dégradé horizontal `neutral900 → neutral800 → neutral900`, large de 600, qui glisse de −300 à +300 | 1 200 ms, linéaire, en boucle | squelettes |
| `drift` | translateY 0 → −50 % de la colonne (contenu dupliqué) | 70 s / 90 s (sens inverse) / 110 s, linéaire, en boucle | mosaïque de la connexion |
| pression | scale 0.97 (affiche), 0.98 (tuile de genre), 0.99 (ligne À venir) | 150 ms | `Pressable` |
| swipe | translateX, retour en 250 ms ease | — | carte « prochain épisode » |
| progression | largeur, 300 ms | — | barres de progression |
| interrupteur | fond et position de la poignée, 200 ms | — | Switch |
| onglets | aucune animation (changement instantané) | — | — |

Implémente-les avec Reanimated (`withTiming(…, { duration, easing: Easing.ease })`). Ease CSS = `Easing.bezier(0.25, 0.1, 0.25, 1)`.

## 8. Icônes (Phosphor)
`phosphor-react-native`, `weight="regular"` sauf mention **fill**.

| Icône | Taille | Où |
|---|---|---|
| BookmarkSimple (fill si actif) | 24 | tab Ma liste |
| Compass (fill si actif) | 24 | tab Découvrir |
| CalendarBlank (fill si actif) | 24 | tab À venir ; bandeau « En salle le… » (18) ; état vide À venir (40) |
| UserCircle (fill si actif) | 24 | tab Profil |
| MagnifyingGlass | 22 / 16 / 36 | bouton recherche / dans le champ / état vide |
| CaretLeft | 22 (barre) / 20 (rond sur image) | retour |
| CaretUp / CaretDown | 16 | sections repliables |
| CaretRight | 16 | lignes cliquables |
| DotsThree | 22 | menu de fiche série |
| BellRinging / BellSlash | 20 | cloche de fiche ; BellRinging 32 sur l'écran notifications |
| Check | 14 (affiche) / 16–17 (coche) / 18 (boutons) / 12 (badge de tuile) | validation ; dessiner en bold (`weight="bold"`) quand posé sur l'accent |
| Checks | 18 | « Tout marquer comme vu » |
| Plus | 14 / 15 / 18 | ajout |
| Eye / Eye **fill** / EyeSlash | 18 / 20 | marquer vu / vu / non vu |
| Trash | 20 | retirer |
| PauseCircle / PlayCircle | 20 / 22 | abandonner / reprendre ; PlayCircle sur l'écran notifications |
| FilmSlate | 18 / 22 | au cinéma |
| TelevisionSimple | 18 / 20 / 22 / 40 | disponible, plateformes, vide séries |
| Question | 18 | pas de date |
| Smiley **fill** / SmileySad **fill** | 18 | Rotten Tomatoes ≥ 60 % / < 60 % |
| Play **fill** | 22 | bande-annonce |
| AppleLogo **fill** / GoogleLogo | 20 | connexion |
| Popcorn | 24 | logo de l'app |
| SlidersHorizontal | 18 | filtres |
| ClockCounterClockwise | 16 | recherches récentes |
| X | 16 / 20 | retirer, fermer |
| SortAscending | 16 | tri |
| FilmStrip | 40 | état vide films |
| CloudSlash | 14 / 40 | hors ligne |
| Globe / Translate / ShieldCheck / SignOut | 20 / 20 / 20 / 18 | Profil |
| Circle | 20 | option de tri non choisie |
| CellSignalFull **fill**, WifiHigh, BatteryFull **fill** | 16 | barre d'état du prototype uniquement (l'app utilise la vraie) |

## 9. Classes Nocturne reprises
- `.btn` : `flexDirection row`, centré, `gap 6`, padding vertical 5.6 / horizontal 10.08, rayon 8, bord 1 transparent, texte 14/500 `text`. Le prototype fixe toujours la hauteur (32 à 50, voir composants).
- `.btn-primary` : texte et bord `accent` ; pressé `accentA22`.
- `.btn-secondary` : bord `divider` ; pressé `textA14`.
- `.btn-ghost` : texte `accent`, padding horizontal 2.8 ; pressé `accentA18 = rgba(145,132,217,0.18)`. Le prototype force souvent la couleur du texte (`text`, `neutral400`, `accent300`) : respecte-la.
- `.btn-icon` : 36 × 36 par défaut, agrandi à 40–44 dans l'app.
- `.input` : hauteur min 36 (42 ou 48 dans l'app), padding 6/10, 14 pt, fond `surface`, bord 1 `divider`, rayon 8, curseur `accent` ; focus : bord `accent`.
- `.field > label` : 12 pt, `textA70`, marge basse 5.
- `.seg` : bord 1 `divider`, rayon 8, débordement masqué. `.seg-opt` : padding 7/12, 13 pt, séparateur 1 `divider` à gauche des options suivantes ; sélectionné : texte `accent` + contour intérieur 1 `accent`.
- `.tag` : 11 pt, ls 0.22, padding 3/10, rayon 6. `.tag-neutral` : fond `neutral800`, texte `neutral100`. `.tag-accent` : fond `accent800`, texte `accent100`. `.tag-outline` : bord 1 `accent`, texte `accent`.
- `.dialog` : largeur `min(440, 100 % − 22.4)`, colonne, gap 8.4, padding 11.2, rayon 14, fond `surface`, `shadowLg`. `.dialog-title` 20/500. `.dialog-body` 14, opacité 0.85. `.dialog-actions` : rangée alignée à droite, gap 5.6, marge haute 5.6.
- États désactivés : opacité 0.45.
- Focus clavier (accessibilité) : contour 2 `accent`, décalage 2.
