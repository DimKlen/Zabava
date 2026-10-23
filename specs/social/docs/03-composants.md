# 03 — Composants

## 0. Rôles visuels (à faire correspondre aux tokens de l'app)
| Rôle | Usage dans le social |
|---|---|
| `accent` | bouton primaire, onglet actif, barres de progression, coche « dans ma liste », badge du nombre de demandes, contour du cadre du scanner, « Disponible » |
| `onAccent` | contenu posé sur l'accent (coche, chiffre du badge) |
| `bg` | fond des écrans, bordure de la pile d'avatars (quand elle est posée sur `bg`), fond de la carte QR |
| `surface` | cartes (Tes abonnements, Ils l'ont vu, activité de Découvrir, lignes de réglages, verrou), bottom sheets |
| `surface2` | chip « titres en commun », fond d'avatar sans photo, cercle du verrou |
| `textPrimary` | noms, titres de titres dans les phrases |
| `textSecondary` | @pseudo, libellés de compteurs, statuts, verbes des phrases d'activité |
| `textTertiary` | heures, aides, mentions |
| `divider` | contour des champs, séparateurs du fil |
| `danger` (si l'app en a un) | « Déjà pris » et « Débloquer » ; sinon, style neutre |

Typo : la police et la graisse « titre » de l'app. Les tailles sont données en pt. « Semibold » = la graisse utilisée par l'app pour les titres de lignes.

---

## Avatar
- Rond. Tailles **24 / 32 / 40 / 44 / 48 / 56 / 88**.
- Photo (`avatar_url`) en `cover`. Sans photo : **initiale** (1re lettre du nom affiché, en majuscule) en `textPrimary` sur `surface2`. Taille de l'initiale ≈ 36 % du diamètre (88 → 32, 56 → 20, 44 → 16, 40 → 15, 32 → 12, 24 → 11).
- Mon avatar sans photo : initiale sur le fond accent foncé de l'app (comme l'avatar actuel du Profil).
- `accessibilityLabel` = nom affiché.

## AvatarStack (pile d'avatars)
- Jusqu'à **5** avatars de **32**, qui se chevauchent de **10** (`marginLeft: -10` à partir du 2e), avec une bordure de **2** de la couleur du fond sur lequel la pile est posée (ici `surface`).
- Ordre : abonnements les plus récents en premier.

## FollowButton (bouton de suivi)
Deux tailles : **normale** (hauteur 44, pleine largeur, icône 18, texte 14) sur les profils ; **compacte** (hauteur 32, padding horizontal 12, icône 15, texte 13, zone tactile ≥ 44) dans les listes et les cartes.

| État | Libellé | Icône Phosphor | Style | Tap |
|---|---|---|---|---|
| Je ne suis pas | **Suivre** | UserPlus | primaire | suit, ou envoie une demande si le profil est privé |
| Je ne suis pas, la personne me suit | **Suivre en retour** | UserPlus | primaire | idem |
| Demande envoyée | **Demandé** | Clock | secondaire | annule la demande (toast « Demande annulée ») |
| Je suis | **Abonné** | Check | secondaire | action sheet titrée « @pseudo » avec « Se désabonner » (UserMinus) |
| Bloqué par moi | **Débloquer** | Prohibit | secondaire (ou danger) | débloque (toast « @pseudo est débloqué·e ») |
- Jamais affiché sur ma propre ligne.
- Changement d'état **immédiat** (optimiste). Retour en arrière avec un toast si l'appel échoue.
- Hors ligne : aucun changement, toast « Connexion requise ».
- Haptique légère au passage à Abonné ou Demandé.
- Dans la carte compacte « Ils l'ont vu », le bouton n'affiche que le libellé (pas d'icône), sur toute la largeur de la carte.
- Le tap ne doit jamais déclencher le tap de la ligne ou de la carte parente.

## MemberRow (ligne de membre)
- Rangée, hauteur min **60**, padding `8 8 8 16`, gap 12, fond `surface` à la pression.
- Avatar **44** · colonne (flex 1) : nom **15 semibold** `textPrimary` sur 1 ligne · sous-titre **13** `textSecondary` sur 1 ligne : `@pseudo`, suivi de ` · {n} titres en commun` si n ≥ 3.
- À droite : FollowButton compact, et/ou bouton « … » (40 × 40, icône DotsThree 20 `textSecondary`) sur ma liste d'abonnés.
- Tap sur la ligne → profil.

## CommonChip (« titres en commun »)
Hauteur 28, padding horizontal 10, rayon pilule, fond `surface2`, icône Cards 15 + texte 13 `textPrimary`, gap 6 : « 12 titres en commun ».

## Counters (compteurs)
Deux boutons côte à côte, gap 18, hauteur min 36. Nombre **18 semibold** `textPrimary` + libellé **13** `textSecondary`, alignés sur la ligne de base, gap 5. Libellés : `abonné`/`abonnés`, `abonnement`/`abonnements` (singulier pour 0 et 1). Nombres ≥ 10 000 abrégés : `12,4 k`.

## ProfileHeader (en-tête de profil)
- Rangée, gap 16, padding `12 16 0` : Avatar **88** · colonne (gap 2) :
  - nom affiché, taille « titre de fiche » de l'app (**24**), 1 ligne ;
  - rangée (gap 6, retour à la ligne) : `@pseudo` 14 `textSecondary` · icône LockSimple 14 si privé · tag **« Te suit »** (tag neutre de l'app) si la personne me suit ;
  - Counters, marge haute 4.
- Sous la rangée, si ≥ 3 : CommonChip (padding `10 16 0`).

## ProfileLists (listes du profil)
- Onglets soulignés **Films · Séries · Animés** (padding `14 16 0`), composant existant.
- Contrôle segmenté (padding `12 16 0`), composant existant :
  - Films : **À voir | Vus**, défaut **Vus** ;
  - Séries / Animés : **En cours | Terminées | À voir**, défaut **En cours**.
- Grille de 3 affiches (composant existant), gap vertical 12 et horizontal 8, padding `12 16 0`, sans badge de plateforme. Sur chaque affiche, le bouton +/coche de l'app concerne **ma** liste : coche si le titre est dans ma liste, sinon « + » pour l'ajouter.
- Sous chaque affiche « En cours » (gap 6) : barre de progression (hauteur 3, rayon 3, piste `surface2`, remplissage `accent`) puis le code du **dernier épisode vu** `S02 E05` en 12 `textSecondary`.
- Chargement : 6 squelettes d'affiche. Pagination par 30 (`onEndReached`).
- Vide : icône FilmStrip 36 + « Rien ici pour l'instant » 16 semibold, padding `40 16`.

## LockedState (profil privé non suivi) et BlockedState
Carte `surface`, rayon 12, marge `20 16 0`, padding `32 20`, colonne centrée, gap 8 :
- cercle 56 `surface2` avec LockSimple 26 (ou Prohibit pour le blocage) ;
- titre 17 semibold : **« Ce profil est privé »** / **« Tu as bloqué ce profil »** ;
- texte 14 `textSecondary` : **« Suis @pseudo pour voir ses listes »** / **« Débloque-le pour voir ses listes et vous suivre à nouveau. »**
Remplace ProfileLists.

## FollowingCard (« Tes abonnements » sur une fiche)
- Titre de section « Tes abonnements », au style des titres de section de la fiche.
- Bouton pleine largeur, hauteur min 52, padding `8 12 8 22`, rayon 12, fond `surface`, rangée gap 12 : AvatarStack · texte 14 `textSecondary` (flex 1) · CaretRight `textTertiary`.
- Texte : 1 → « Léa » ; 2 → « Léa et Max » ; 3 → « Léa, Max et Sarah » ; ≥ 4 → « Léa, Max et {n−2} autres ». Prénoms = premier mot du nom affiché.
- Tap → FollowingSheet.

## FollowingSheet
Bottom sheet (hauteur max 75 % de l'écran, contenu défilant) :
- poignée, titre 18 semibold « Tes abonnements », sous-titre 13 `textSecondary` = titre de l'œuvre ;
- lignes : hauteur min 56, padding `6 12`, gap 12, avatar 40, nom 15 semibold, statut 13 `textSecondary`, CaretRight ;
- statuts : film → **« Vu le 12 oct. »** ou **« Dans sa liste »** ; série/animé → **« En cours · S02 E05 »**, **« Terminée »**, **« Abandonnée »**, **« Dans sa liste »** ;
- bouton secondaire pleine largeur « Fermer » (46).
- Tri : les plus récents en premier (date de la dernière action sur le titre).

## SawCard (carte « Ils l'ont vu »)
Largeur **120**, padding `14 10 10`, rayon 12, fond `surface`, colonne centrée, gap 6 : avatar **56** · `@pseudo` 13 semibold, 1 ligne avec points de suspension · « 14 titres en commun » 12 `textSecondary` centré (« Aucun titre en commun » pour 0, « 1 titre en commun » pour 1) · FollowButton compact pleine largeur, marge haute 2. Tap sur la carte → profil.
Carrousel horizontal, gap 10, padding horizontal 16, **10 cartes au plus**.

## ActivityItem (élément du fil)
Rangée alignée en haut, gap 12, padding vertical 10, séparateur bas 1 `divider` :
- avatar **40** de l'auteur (tap → profil) ;
- colonne (flex 1) : phrase **15**, interligne 1.4 : **prénom** en semibold `textPrimary` (tap → profil) · verbe en `textSecondary` · **titre** en semibold `textPrimary` · fin éventuelle en `textSecondary`. Heure 13 `textTertiary`, marge haute 2, ex. « 21 h 40 » ;
- à droite (tap → fiche ou profil cible) :
  - **affiche** 48 × 72, rayon 6 ; si le titre est dans ma liste, pastille de coche 20 `accent` en `right −4, bottom −4`, bordure 2 couleur du fond ;
  - **vignette d'épisode** 64 × 36, rayon 6, marge haute 4 (épisode unique, non masqué) ;
  - **avatar 48** de la personne suivie (type « suit maintenant »).

## ActivityCard (carte du carrousel de Découvrir)
Largeur **256**, padding 10, rayon 12, fond `surface`, rangée alignée en haut, gap 10 :
- colonne (flex 1, gap 6) : rangée avatar 24 + prénom 13 semibold + quand (12 `textTertiary`, poussé à droite) · phrase 13, interligne 1.35, 3 lignes max (sans le prénom) ;
- visuel de droite identique à ActivityItem (pastille avec bordure couleur `surface`).
- « Quand » : aujourd'hui → l'heure ; hier → « Hier » ; sinon la date courte « 7 oct. ».

## QRCard
Carte fond `bg`, rayon 12, padding 20, colonne centrée, gap 8 :
- QR code **200 × 200** du lien de profil, correction d'erreur **H**, modules clairs sur fond sombre (comme le PDF : « QR blanc sur noir »), avec 2 modules de marge ;
- au centre, mon avatar **48** avec une bordure de 4 couleur `bg` ;
- `@pseudo` 16 semibold ; `{DOMAINE}/u/{pseudo}` 12 `textTertiary`.
Bibliothèque : `react-native-qrcode-svg` (`ecl="H"`, `logo` = avatar).

## UsernameField (champ pseudo)
- Rangée hauteur 48, padding horizontal 12, rayon de l'app, fond `surface`, bordure 1 : `accent` si disponible, `textSecondary` si pris, sinon `divider`.
- Préfixe « @ » 16 `textTertiary` · champ 16 (`autoCapitalize="none"`, `autoCorrect={false}`, `keyboardType="ascii-capable"` sur iOS) · à droite : indicateur de chargement 16 pendant la vérification, ou CheckCircle (fill) 20 `accent` si disponible.
- Ligne d'état en dessous (gap 8), 13 pt :
  | État | Texte |
  |---|---|
  | vérification | « Vérification… » `textTertiary` |
  | disponible | « Disponible » `accent` (variante lisible de l'accent) |
  | pris | icône XCircle + « Déjà pris. Essaie plutôt : » (`danger` ou `textPrimary`), puis 3 chips de propositions (`@dim.tv`…) ; tap = remplit le champ et relance la vérification |
  | invalide | « 3 à 20 caractères : lettres minuscules, chiffres, point et tiret bas. » `textSecondary` |
  | hors ligne / erreur | « Vérification impossible, réessaie » `textSecondary` |
  | pseudo actuel (écran Modifier) | aucune ligne |
- Vérification **300 ms** après la dernière frappe ; une réponse obsolète (pour une ancienne valeur) est ignorée.
