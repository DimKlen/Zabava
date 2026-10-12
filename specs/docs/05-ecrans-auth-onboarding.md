# 05 — Connexion, onboarding, notifications

Référence : prototype, blocs `isLogin`, `isOnb`, `isNotif`.

## 5.1 Connexion (`/login`)
**But** : se connecter avec Apple ou Google.

**Fond**
- Mosaïque d'affiches : 3 colonnes (flex 1, gap 10), dans un conteneur qui déborde de l'écran (`top/bottom −60`, `left/right −40`), pivoté de **−8°**, flou 3 (`expo-blur`, ou des images pré-floutées), opacité 0.6.
- Chaque colonne contient une liste d'affiches populaires, **dupliquée** pour boucler (vraies affiches TMDB du endpoint `/trending/all/week`, réparties colonne = index % 3 ; dégradé de remplacement en attendant). Affiches 2:3, rayon 8, gap 10.
- Animation `drift` : colonnes 1 et 3 vers le haut en 70 s et 110 s, colonne 2 vers le bas (sens inverse) en 90 s, linéaire, en boucle.
- Voile par-dessus : dégradé vertical de `bgA20` (0 %) à `bg` (60 %), puis `bg` jusqu'en bas.

**Contenu** : colonne en bas, `left/right 24`, `bottom 44 + inset`, gap 12.
1. Logo : rangée, gap 10, marge basse 8. Carré 44 × 44, rayon 12, bord 1 `accent`, halo (ombre `accentA35`, rayon 24), icône Popcorn 24 `accent`. À côté : « Suivi » 20/500.
2. Titre `display` 34/500, interligne 1.1 : **« Tout ce que tu regardes, au même endroit »**.
3. Texte 15 `neutral400`, marge basse 10 : **« Films, séries et animés : ta liste, tes épisodes et les sorties à venir. »**
4. Bouton principal, 50, 15/500, icône AppleLogo fill 20 : **« Continuer avec Apple »**. Sur iOS, utilise `expo-apple-authentication` pour l'appel, mais garde ce visuel. Les règles Apple acceptent un bouton personnalisé s'il respecte leurs consignes : logo Apple, libellé « Continuer avec Apple », hauteur ≥ 44.
5. Bouton secondaire, 50, 15/500, icône GoogleLogo 20 : **« Continuer avec Google »**.
6. Pendant l'authentification : texte centré 13 `accent300` **« Connexion en cours… »**, et les deux boutons sont désactivés.
7. Mention 12 `neutral500`, interligne 1.5, marge haute 4 : « En continuant, tu acceptes les **conditions d'utilisation** et la **politique de confidentialité**. » Les deux expressions en gras sont des liens `accent`, soulignés.

**Erreurs** (à la place de « Connexion en cours… », même style, couleur `neutral300`) :
- Annulation par l'utilisateur : **« Connexion annulée »**.
- Autre échec : **« Impossible de se connecter, réessaie »**.

**Après succès** : création ou mise à jour de `profiles` (display_name, avatar_url, email depuis le fournisseur ; region `CA` et language `fr-CA` par défaut, ou devinées depuis `expo-localization`). Si `onboarded_at` est nul → `/onboarding/region`, sinon → watchlist.

## 5.2 Onboarding — structure commune
- Fondu 300 ms à l'entrée de chaque étape.
- **Barre du haut** (hauteur 52, padding 8, rangée centrée, gap 12, sous la zone sûre) :
  - zone gauche de 44 : CaretLeft 22 `text` (ghost icône 44) aux étapes 2 et 3, vide à l'étape 1 ;
  - progression : 3 segments flex 1, gap 6, hauteur 4, rayon 4. Remplis (`accent`) jusqu'à l'étape courante incluse, sinon `neutral800`. Transition de couleur 300 ms ;
  - **« Passer »** : bouton ghost, hauteur 44, padding horizontal 12, texte `neutral400`.
- **Contenu** : défilant, padding 16. Titre 28/500, marge basse 8 ; texte 15 `neutral400`.
- **Pied** : padding `12 16 34`, fond dégradé `bg` (70 %) → transparent vers le haut, colonne gap 8. Bouton principal 50, 15/500.

### Étape 1 — Région et langue (`/onboarding/region`)
- Titre **« Où regardes-tu ? »**
- Texte (marge basse 24) **« Ta région détermine les plateformes et les dates de sortie affichées. On l'a pré-remplie depuis ton téléphone. »**
- Deux champs (gap 16), libellé `.field > label` puis sélecteur `.input` de hauteur 48 avec chevron à droite (CaretDown 16 `text`) :
  - **Région** : Canada · France · Belgique · Suisse · États-Unis (codes `CA FR BE CH US`). Défaut : région du téléphone si elle est dans la liste, sinon Canada.
  - **Langue** : Français (fr-CA) · Français (fr-FR) · English (en-CA) · English (en-US). Défaut : fr-CA.
  - Sélecteur : ouvre une ActionSheet avec les options (option active marquée d'une icône Check). Pas de `Picker` natif.
- Bouton **« Continuer »** → `PUT /me/profile {region, language}` → étape 2.

### Étape 2 — Mes plateformes (`/onboarding/platforms`)
- Titre **« Tes plateformes »**
- Texte **« On les met en avant et on te prévient quand un film de ta liste y arrive. »**
- Grille de 3 colonnes, gap 10. Tuiles : colonne centrée, gap 8, padding `16 6 12`, rayon 12, bord 1.
  - Non sélectionnée : fond `surface`, bord transparent.
  - Sélectionnée : fond `accent900`, bord `accent`, pastille de coche en `top 6, right 6` (20 × 20, cercle `accent`, Check 12 bold `bg`).
  - Contenu : pastille de logo 44 (fond `neutral800`, logo TMDB ou abréviation 13/600) et nom 12 centré.
- Liste (région CA ; pour les autres régions, les plateformes d'abonnement TMDB les plus courantes de la région) : Netflix, Prime Video, Disney+, Crave, Apple TV+, Crunchyroll, Paramount+, ICI TOU.TV.
- Sélection multiple, tap = bascule. Aucune présélection pour un nouveau compte (le prototype présélectionne Netflix, Crave et Prime Video pour la démo).
- **« Continuer »** → `PUT /me/providers` → étape 3.

### Étape 3 — Premiers titres (`/onboarding/titles`)
- Titre **« Tes premiers titres »**, texte (marge basse 8) **« Touche ce que tu veux voir ou suivre. »**
- UnderlineTabs (gap 20, marge basse 12) : Films · Séries · Animés.
- Grille d'affiches populaires du type choisi (`/discover?type=…&sort=pop`, 30 titres). Affiches sans badge, avec « + ». Un tap sur l'affiche **ou** sur le « + » bascule l'ajout (film → À voir, série/animé → suivi), avec haptique Light. **Pas de toast.**
- Au-dessus du bouton : compteur 13 `accent300`, centré :
  - 0 titre ajouté : **« Touche une affiche pour l'ajouter »**
  - 1 : **« 1 titre ajouté »**
  - n : **« {n} titres ajoutés »** (ne compte que les titres ajoutés pendant l'onboarding).
- Bouton **« Terminer »** → `PUT /me/profile {onboarded_at}` → `/onboarding/notifications`.

## 5.3 Explication des notifications (`/onboarding/notifications`)
- Fondu 300 ms. Padding `120 24 34` (le haut tient compte de la zone sûre : 120 au total depuis le haut de l'écran).
- Icône : carré 64, rayon 18, fond `accent900`, BellRinging 32 `accent`, marge basse 24.
- Titre 30/500, marge basse 12 : **« Ne rate aucune sortie »**
- Texte 15 `neutral400`, marge basse 28 : **« On t'envoie au plus une alerte par titre et par jour, seulement pour ce que tu suis. »**
- Liste (gap 18). Chaque élément : rangée gap 14, icône 22 `accent`, puis titre 15/500 et description 13 `neutral400` :
  1. TelevisionSimple — **Nouveaux épisodes** — « Le jour de diffusion, à l'heure locale. »
  2. FilmSlate — **Sorties en salle** — « Quand un film de ta liste sort au cinéma. »
  3. PlayCircle — **Disponibilité en streaming** — « Quand un film arrive sur tes plateformes. »
- En bas (marge auto), gap 8 :
  - bouton principal 50 **« Activer les notifications »** → demande système iOS/Android. Accordé : récupère le jeton Expo et fait `POST /me/push-token`. Refusé : coupe les 4 préférences de notification. Dans les deux cas → watchlist ;
  - bouton ghost 44, texte `neutral400`, **« Plus tard »** → watchlist (préférences inchangées, permission non demandée ; elle sera demandée au premier tap sur une cloche ou sur un interrupteur de notification).
- Le prototype simule la boîte de dialogue système (« « Suivi » souhaite vous envoyer des notifications », Refuser / Autoriser). Dans l'app, c'est la vraie boîte système : **ne pas la recréer**.
