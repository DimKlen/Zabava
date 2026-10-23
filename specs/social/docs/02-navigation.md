# 02 — Navigation

La tab bar garde ses **4 onglets**. Aucun onglet n'est ajouté.

## 1. Où le social s'insère
| Endroit | Avant | Après |
|---|---|---|
| Onglet Profil | Compte et réglages | **Mon profil** (en-tête, compteurs, Modifier le profil, Inviter, demandes, listes). Icônes en haut à droite : personne + (Inviter) et engrenage (Réglages) |
| Réglages | dans l'onglet Profil | **écran poussé** depuis l'engrenage, avec le contenu actuel plus la section Confidentialité et 2 interrupteurs de notification |
| Onglet Découvrir | carrousels | nouveau carrousel **« Activité de tes abonnements »** tout en haut, avec un lien « Tout voir » vers le fil |
| Recherche | Tout / Films / Séries / Animés / Personnes | onglet **« Membres »** en dernier. « @ » au début du champ bascule sur Membres. Ligne « Chercher un membre » dans l'état sans saisie |
| Fiche film / série / animé | — | blocs **« Tes abonnements »** et **« Ils l'ont vu »**, juste sous « Où regarder » (onglet Infos pour les séries et animés) |
| Onboarding | 3 étapes | **4 étapes**, « Choisis ton pseudo » en premier |

## 2. Nouvelles routes (Expo Router, à adapter à l'arborescence existante)
```
app/
  u/[username].tsx                 # profil d'un autre utilisateur (moi → redirige vers l'onglet Profil)
  u/[username]/connections.tsx     # ?tab=followers|following
  feed.tsx                         # fil d'activité
  follow-requests.tsx              # demandes d'abonnement
  settings/index.tsx               # réglages (contenu actuel de l'onglet Profil, déplacé)
  settings/blocked.tsx             # comptes bloqués
  profile/edit.tsx                 # modifier le profil
  scan.tsx                         # scanner un QR code (modal plein écran)
  onboarding/username.tsx          # nouvelle 1re étape
  username-required.tsx            # même écran pour les comptes existants sans pseudo
```
- Écrans poussés : même animation que les fiches existantes. La tab bar est masquée.
- Les bottom sheets (Inviter, Tes abonnements, menus) ne sont **pas** des routes : ce sont des overlays du store d'interface.
- `scan.tsx` : présentation modale plein écran, entrée en fondu.

## 3. Matrice des liens
| Depuis | Élément | Action / destination |
|---|---|---|
| Onboarding pseudo | « Continuer » (inactif tant que le pseudo n'est pas valide) | enregistre le pseudo et la visibilité → étape Région |
| Mon profil | personne + / bouton « Inviter » | sheet Inviter |
| Mon profil | engrenage | `settings` |
| Mon profil | « Modifier le profil » | `profile/edit` |
| Mon profil | compteur abonnés / abonnements | `u/{moi}/connections?tab=followers|following` |
| Mon profil | ligne « Demandes d'abonnement » (seulement si privé et ≥ 1 demande) | `follow-requests` |
| Mon profil, profil d'un autre | affiche | fiche du titre |
| Mon profil, profil d'un autre | + / coche de l'affiche | ajout ou retrait de **ma** liste (comportement existant) |
| Profil d'un autre | bouton de suivi | voir les états, `docs/03` FollowButton |
| Profil d'un autre | « … » | action sheet : Partager le profil · Retirer de mes abonnés (si elle me suit) · Bloquer / Débloquer · Signaler |
| Profil d'un autre (privé non suivi, ou bloqué) | compteurs | toast « Ce profil est privé » / « Tu as bloqué ce profil » |
| Abonnés / Abonnements | ligne | profil (moi → onglet Profil) |
| Mes abonnés | « … » d'une ligne | action sheet « Retirer cet abonné » |
| Abonnements (vide, moi) | « Trouver des membres » | Recherche, onglet Membres, champ pré-rempli « @ » |
| Abonnés (vide, moi) | « Inviter » | sheet Inviter |
| Recherche | « Chercher un membre » | champ « @ », onglet Membres |
| Recherche › Membres | ligne | profil (et ajout aux « Personnes suivies récemment ») |
| Recherche › Membres (vide) | « Inviter quelqu'un » | sheet Inviter |
| Sheet Inviter | « Partager mon lien » | feuille de partage native |
| Sheet Inviter | « Copier le lien » | presse-papiers + toast |
| Sheet Inviter | « Scanner un code » | `scan` |
| Scanner | code Zabava reconnu | ferme le scanner et la sheet → `u/{pseudo}` |
| Fiche titre | carte « Tes abonnements » | sheet listant chaque abonnement avec son statut |
| Sheet « Tes abonnements » | ligne | profil |
| Fiche titre | carte « Ils l'ont vu » | profil ; bouton compact = suivre |
| Découvrir | « Tout voir » | `feed` |
| Découvrir | carte d'activité | fiche du titre (ou profil de la personne suivie pour « suit maintenant ») ; avatar → profil de l'auteur |
| Fil | avatar ou nom | profil de l'auteur |
| Fil | affiche / vignette / avatar cible à droite | fiche du titre / profil cible |
| Fil (vide) | « Trouver des membres » | Recherche › Membres |
| Demandes | « Accepter » / « Refuser » / « Tout accepter » | actions (voir `docs/04`) ; ligne → profil |
| Réglages | « Comptes bloqués » | `settings/blocked` |
| Modifier le profil | « Enregistrer » | enregistre → retour + toast « Profil mis à jour » |

## 4. Liens profonds
| Lien | Destination |
|---|---|
| `zabava://u/{pseudo}` et `https://{DOMAINE}/u/{pseudo}` | profil |
| notification « Nouvel abonné » | profil de la personne |
| notification groupée « Léa et 4 autres te suivent » | `u/{moi}/connections?tab=followers` |
| notification « Demande d'abonnement » | `follow-requests` |
| notification « Demande acceptée » | profil de la personne |

- App fermée : la pile reconstruite est `(tabs)/watchlist` puis la destination.
- **Non connecté** : on garde la destination (`pendingDeepLink` en AsyncStorage), on passe par la connexion et l'onboarding, puis on ouvre le profil de l'invitant.
- **App non installée** : la page web `https://{DOMAINE}/u/{pseudo}` affiche l'avatar, le nom, le @pseudo et des boutons App Store / Google Play (redirection automatique selon l'user-agent). Liens universels iOS (`apple-app-site-association`) et App Links Android (`assetlinks.json`) à configurer sur `{DOMAINE}`.
- Pseudo inexistant, compte supprimé, ou qui m'a bloqué : écran « Ce profil n'existe pas ou n'est plus disponible » avec un bouton « Retour ».
- Mon propre pseudo : ouvre l'onglet Profil.
