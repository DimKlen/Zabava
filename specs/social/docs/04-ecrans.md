# 04 — Écrans

Les marges latérales, la barre de retour, les titres de section, les bottom sheets et les états de chargement suivent les conventions de l'app existante. Les valeurs ci-dessous viennent du prototype.

---

## 4.1 Onboarding — étape 1 « Choisis ton pseudo »
Nouvelle première étape, avant Région et langue. La barre de progression passe à **4 segments**. Cette étape n'a **ni bouton « Passer » ni bouton retour**.
1. Avatar OAuth **88** centré, nom en dessous (15 `textSecondary`), marge basse 24.
2. Titre (style des titres d'onboarding) : **« Choisis ton pseudo »**.
3. Texte : **« C'est ton identifiant sur Zabava. Tes amis te trouveront avec. »**
4. UsernameField, pré-rempli avec la proposition (`docs/01` §2), vérifiée tout de suite.
5. Carte (`surface`, rayon 12, padding `12 14`) : « Profil privé » 15 + « Seules les personnes que tu acceptes verront tes listes et ton activité. » 13 `textSecondary` · interrupteur, **désactivé par défaut**.
6. Bouton principal **« Continuer »**, inactif (opacité de l'état désactivé de l'app) tant que l'état n'est pas « disponible ». Tap → `PUT /me/profile {username, isPrivate}`, puis étape Région. Un `409` (pris entre-temps) remet l'état à « Déjà pris » avec des propositions.
- **Comptes existants sans pseudo** : même contenu, en plein écran (`username-required`), sans barre de progression, bouton « Continuer » → retour à l'app.

## 4.2 Mon profil (onglet Profil)
1. Barre : titre d'onglet **« Profil »** à gauche ; à droite, deux boutons icône 44 : UserPlus (Inviter) et GearSix (Réglages).
2. ProfileHeader (sans « Te suit » ni chip en commun).
3. Rangée de boutons (gap 8, padding `16 16 0`, flex 1 chacun, hauteur 44) : **« Modifier le profil »** (secondaire) · **« Inviter »** (primaire, icône UserPlus).
4. Si mon profil est **privé** et que j'ai **au moins une demande** : ligne (marge `12 16 0`, hauteur min 52, rayon 12, `surface`, gap 12) : icône UserCirclePlus 20 · « Demandes d'abonnement » 15 · badge (hauteur 22, largeur min 22, pilule, `accent`, chiffre 12 `onAccent`) · CaretRight. Tap → Demandes.
5. ProfileLists avec **mes** titres :
   - Films : À voir = mes films « à voir » (tri par date d'ajout décroissante), Vus = mes films vus (tri par date de visionnage décroissante) ;
   - Séries / Animés : En cours = sections À regarder + Pas regardé depuis un moment + À jour ; Terminées = Terminées ; À voir = Pas encore commencées. Les abandonnées ne sont pas affichées.
- Tirer pour rafraîchir.

## 4.3 Modifier le profil (`profile/edit`)
- Barre : retour · « Modifier le profil » · bouton ghost **« Enregistrer »** à droite, inactif si le pseudo modifié n'est pas disponible.
- Contenu (padding `8 16 40`, colonne gap 20) :
  1. avatar 88 centré + bouton ghost **« Changer la photo »** → action sheet « Photo de profil » : **« Photo de mon compte {Apple|Google} »** · **« Choisir dans la bibliothèque »** (`expo-image-picker`, recadrage carré, envoi vers Supabase Storage `avatars/{userId}.jpg`, 512 × 512, JPEG 80 %) · **« Supprimer la photo »** (si une photo personnalisée existe) ;
  2. champ **Pseudo** (UsernameField, pré-rempli, état « pseudo actuel »), puis aide 12 `textTertiary` : **« Modifiable une fois tous les 30 jours. L'ancien pseudo reste réservé 30 jours. »** Si le dernier changement date de moins de 30 jours, le champ est en lecture seule et l'aide devient **« Tu pourras changer de pseudo à partir du {d MMMM} »** ;
  3. champ **Nom affiché** (1 à 40 caractères) ;
  4. carte Profil privé (même texte qu'à l'onboarding).
- Enregistrer → `PUT /me/profile`, retour, toast **« Profil mis à jour »**. Passer de privé à public applique la règle d'acceptation automatique (`docs/01` §3).
- Quitter avec des modifications non enregistrées → dialogue **« Abandonner les modifications ? »** · Continuer · Abandonner.

## 4.4 Profil d'un autre utilisateur (`u/[username]`)
- Barre : retour · bouton icône « … » à droite.
- ProfileHeader complet (« Te suit », CommonChip).
- FollowButton **normal**, pleine largeur, padding `16 16 0`.
- Puis, selon le cas :
  - accessible (public, ou privé et suivi) → ProfileLists avec **ses** titres (Films : À voir / Vus ; Séries : En cours avec sa progression / Terminées / À voir) ;
  - privé non suivi (y compris demande envoyée) → LockedState ;
  - bloqué par moi → BlockedState.
- Menu « … » (action sheet titrée « @pseudo ») : **Partager le profil** (ShareNetwork → feuille de partage avec le lien) · **Retirer de mes abonnés** (UserMinus, seulement si la personne me suit) · **Bloquer** (Prohibit → dialogue) ou **Débloquer** · **Signaler** (Flag → action sheet des motifs).
- Dialogue de blocage : titre **« Bloquer @pseudo ? »**, corps **« Vous ne pourrez plus vous suivre et vous n'apparaîtrez plus dans vos recherches ni sur vos fiches. {Prénom} ne sera pas prévenu·e. »**, boutons **Annuler** · **Bloquer**.
- Ouvrir un profil l'ajoute en tête des « Personnes suivies récemment » (5 maximum, sans doublon, persisté).
- Profil introuvable : « Ce profil n'existe pas ou n'est plus disponible » + bouton « Retour ».

## 4.5 Abonnés / Abonnements (`u/[username]/connections`)
- Barre : retour · nom affiché de la personne.
- Onglets soulignés **Abonnés · Abonnements**, ouverts sur celui qui a été touché.
- Champ de filtre (padding `12 16 4`, hauteur 40, icône MagnifyingGlass 16, placeholder **« Filtrer »**) : filtre local sur le pseudo et le nom, sans accents ni casse ; au-delà de 200 éléments chargés, filtre côté serveur (`?q=`).
- Liste de MemberRow, **plus récent en premier** (date d'abonnement), pagination par 50.
- Sur **ma** liste d'abonnés : bouton « … » par ligne → « Retirer cet abonné ».
- Vides :
  | Cas | Titre | Bouton |
  |---|---|---|
  | mes abonnements | **« Tu ne suis personne pour l'instant »** | **« Trouver des membres »** → Recherche › Membres |
  | mes abonnés | **« Personne ne te suit encore »** | **« Inviter »** → sheet Inviter |
  | ceux d'un autre | **« Rien ici pour l'instant »** | — |
  | filtre sans résultat | **« Aucun membre ne correspond »** | — |
  Icône UsersThree 40.

## 4.6 Recherche — onglet Membres
- Onglets de résultats : Tout · Films · Séries · Animés · Personnes · **Membres**. L'onglet Tout ne contient pas de membres.
- Taper « @ » en **premier caractère** bascule sur Membres. Le « @ » est ignoré pour la recherche.
- Dans l'état **sans saisie** de la recherche, en premier : ligne (marge `8 16 0`, hauteur min 48, rayon 12, `surface`) : icône Users 20 `accent` · **« Chercher un membre »** 15 · **« tape @pseudo »** 13 `textTertiary`. Tap → le champ vaut « @ » et l'onglet Membres est actif.
- Résultats à partir de **2 caractères**, délai 300 ms, par **préfixe** sur le pseudo, sur le début du nom ou sur le début d'un mot du nom (sans accents ni casse).
- Ordre : 1) correspondance exacte du pseudo ; 2) nombre décroissant de **mes abonnements qui suivent cette personne** ; 3) le reste, par nombre d'abonnés décroissant.
- Lignes MemberRow (avec « {n} titres en commun » si ≥ 3).
- Moins de 2 caractères : h6 **« Personnes suivies récemment »** + les 5 derniers profils visités ; s'il n'y en a pas : **« Tape au moins 2 caractères du pseudo ou du nom. »** 14 `textSecondary`.
- Aucun résultat : icône UsersThree 36 · **« Aucun membre trouvé »** · bouton primaire **« Inviter quelqu'un »** (UserPlus) → sheet Inviter.
- Les comptes bloqués (dans un sens ou dans l'autre) n'apparaissent jamais.

## 4.7 Inviter (bottom sheet)
Ouverte depuis Mon profil (icône et bouton), Abonnés vide et Membres vide. Padding `8 16 34`, colonne gap 12.
1. Poignée ; rangée : **« Inviter »** 18 semibold · bouton fermer (X).
2. QRCard.
3. Bouton primaire 48 **« Partager mon lien »** (ShareNetwork) → `Share.share({ message: 'Suis-moi sur Zabava : https://{DOMAINE}/u/{pseudo}' })`.
4. Rangée (gap 8, flex 1, hauteur 44, secondaires) : **« Copier le lien »** (Link) → `Clipboard.setStringAsync`, toast **« Lien copié »** · **« Scanner un code »** (Scan) → écran Scanner.

## 4.8 Scanner (`scan`)
- Fond sombre plein écran. Barre : « Scanner un code » 17 semibold · fermer (X).
- Aperçu caméra (`expo-camera`, `barcodeScannerSettings={{ barcodeTypes: ['qr'] }}`) avec un cadre 240 × 240, rayon 20, contour 2 `accent`.
- Texte : **« Vise le code Zabava d'un ami pour ouvrir son profil. »**
- Code reconnu de la forme `https://{DOMAINE}/u/{pseudo}` ou `zabava://u/{pseudo}` → haptique de succès, fermeture, ouverture du profil. Autre code → toast **« Ce code n'est pas un code Zabava »** (une seule fois par code).
- Permission refusée : **« Autorise l'accès à la caméra pour scanner un code. »** + bouton **« Ouvrir les réglages »** (`Linking.openSettings()`).
- Dans le prototype, un bouton « Simuler un scan » remplace la caméra : **à ne pas reproduire**.

## 4.9 Fiche film / série / animé — blocs sociaux
Ajoutés **juste sous « Où regarder »** : dans l'onglet Infos pour les séries et animés, dans le contenu principal pour les films.
1. **Tes abonnements** (FollowingCard + FollowingSheet). Masqué si aucun de mes abonnements n'a ce titre, quel que soit son statut.
2. **Ils l'ont vu** (carrousel de SawCard). Contenu : profils **publics** qui ont le film en **Vu**, ou la série en **En cours** ou **Terminée**, à l'exclusion de moi, de mes abonnements, de mes demandes en attente et des comptes bloqués. Tri par titres en commun décroissants, 10 au maximum. **Masqué s'il y a moins de 3 profils.**
- Suivre quelqu'un depuis « Ils l'ont vu » le fait passer dans « Tes abonnements » au prochain rafraîchissement du bloc (immédiatement en optimiste).
- Données : `GET /titles/{type}/{tmdbId}/social`, chargé en parallèle de la fiche. Pendant le chargement, rien n'est affiché (pas de squelette, pour ne pas faire sauter la page) ; en cas d'erreur, les blocs sont masqués.

## 4.10 Découvrir — carrousel d'activité
- **Tout en haut** de chaque onglet (Films, Séries, Animés), avant les autres carrousels, marge haute 16.
- En-tête : **« Activité de tes abonnements »** (titre de section) · bouton ghost **« Tout voir »** → Fil.
- Les **6** dernières activités de mon fil (tous types confondus, sans filtrer par l'onglet), en ActivityCard.
- **Masqué** si le fil est vide ou hors ligne sans cache.

## 4.11 Fil d'activité (`feed`)
- Barre : retour · **« Activité de tes abonnements »**.
- Groupes par jour, du plus récent au plus ancien. Libellé du groupe (style des jours d'À venir) : **« Aujourd'hui »**, **« Hier »**, puis `{jour abrégé}. {d} {mois abrégé}` avec majuscule (« Mar. 20 oct. »).
- Éléments : ActivityItem, du plus récent au plus ancien.
- Types et phrases (Prénom = premier mot du nom affiché) :
  | Type | Phrase | Visuel de droite |
  |---|---|---|
  | `added` | **Léa** a ajouté **Dune 3** à sa liste | affiche |
  | `watched_movie` | **Léa** a vu **Dune 3** | affiche |
  | `started_show` | **Léa** a commencé **Frieren** | affiche |
  | `watched_episodes`, 1 épisode | **Léa** a vu S03 E04 « Titre de l'épisode » de **The Bear** | vignette de l'épisode |
  | `watched_episodes`, 1 épisode masqué par l'anti-spoiler | **Léa** a vu S03 E04 de **The Bear** | affiche |
  | `watched_episodes`, n > 1 | **Léa** a vu 5 épisodes de **The Bear** | affiche |
  | `finished_show` | **Léa** a terminé **Arcane** | affiche |
  | `followed` | **Léa** suit maintenant **Max** | avatar 48 de Max |
- Les titres qui sont aussi dans **ma** liste portent la pastille de coche sur l'affiche.
- Tirer pour rafraîchir ; chargement par **30** éléments (pagination par curseur).
- Vide : icône UsersThree 40 · **« Suis des membres pour voir ce qu'ils regardent »** · bouton **« Trouver des membres »** → Recherche › Membres.
- Hors ligne : dernier fil en cache, en lecture seule.

## 4.12 Demandes d'abonnement (`follow-requests`)
- Barre : retour · « Demandes d'abonnement ».
- Si ≥ 2 demandes : rangée (padding `4 8 4 16`) « {n} demandes » 13 `textSecondary` · bouton ghost **« Tout accepter »**.
- Ligne : avatar 44 · nom 15 semibold / @pseudo 13 `textSecondary` (tap → profil) · bouton primaire compact **« Accepter »** · bouton secondaire compact **« Refuser »**.
- Accepter → la ligne disparaît, toast **« {Prénom} te suit maintenant »**. Refuser → la ligne disparaît, sans toast. Tout accepter → toast **« {n} demandes acceptées »**.
- Vide : icône UserCirclePlus 40 · **« Aucune demande »**.
- Plus récentes en premier.

## 4.13 Réglages (`settings`) — modifications
L'écran reprend **tout** le contenu actuel de l'onglet Profil (préférences, notifications, anti-spoiler, à propos, déconnexion, suppression du compte), **sauf** le bloc compte en haut, qui est remplacé par Mon profil. Ordre des groupes :
1. Préférences (inchangé).
2. **Notifications** : interrupteurs existants **+ « Nouvel abonné »** et **« Demandes d'abonnement »** (activés par défaut), puis le récapitulatif quotidien.
3. **Confidentialité** (nouveau) : ligne **« Profil privé »** (icône LockSimple, interrupteur) · ligne **« Comptes bloqués »** (icône Prohibit, nombre ou « Aucun », CaretRight → Comptes bloqués). Sous le groupe, aide 12 `textTertiary` : **« En privé, seules les personnes que tu acceptes voient tes listes et ton activité. »**
4. Anti-spoiler (déplacé ici s'il était dans Préférences).
5. À propos, puis les actions de compte (inchangés).

## 4.14 Comptes bloqués (`settings/blocked`)
Lignes : avatar 44 · nom / @pseudo · bouton secondaire compact **« Débloquer »** (toast « @pseudo est débloqué·e »). Vide : icône Prohibit 40 · **« Aucun compte bloqué »**.
