# Étape 3 — Mon profil, profil d'un autre, suivi

Référence : `docs/04` §4.2 à 4.5, `docs/03`, `docs/07` §3.

## Tâches
1. Composants Avatar, Counters, ProfileHeader, CommonChip, FollowButton, MemberRow, ProfileLists, LockedState, BlockedState.
2. Onglet Profil → Mon profil ; contenu actuel déplacé dans `settings` (sans régression).
3. Modifier le profil (pseudo, nom, photo, privé).
4. Profil d'un autre : bouton de suivi (5 états), menu « … », blocage, signalement, retrait d'abonné.
5. Abonnés / Abonnements avec filtre et pagination.
6. `patchMemberEverywhere` et mutations optimistes ; refus hors ligne.

## Critères d'acceptation
- Suivre un profil public → « Abonné » tout de suite, compteur mis à jour ; un profil privé → « Demandé » + toast.
- « Abonné » → « Se désabonner » → toast avec « Annuler » qui rétablit l'abonnement.
- Un profil privé non suivi montre le cadenas ; ses compteurs affichent le toast « Ce profil est privé ».
- Les affiches d'un autre profil portent ma coche si le titre est dans ma liste ; le « + » l'ajoute à ma liste.
- Hors ligne : aucun bouton social ne change d'état, toast « Connexion requise ».
