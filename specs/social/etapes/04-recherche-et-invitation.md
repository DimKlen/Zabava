# Étape 4 — Recherche Membres, Inviter, scanner, liens profonds

Référence : `docs/04` §4.6 à 4.8, `docs/02` §4.

## Tâches
1. Onglet Membres, bascule « @ », ligne « Chercher un membre », personnes suivies récemment, état vide avec « Inviter quelqu'un ».
2. Sheet Inviter : QRCard, partage, copie.
3. Écran Scanner (`expo-camera`), permission, codes non reconnus.
4. Liens profonds `zabava://u/{pseudo}` et `https://{DOMAINE}/u/{pseudo}` ; lien en attente pour un utilisateur non connecté ; écran « profil introuvable ».
5. Fichiers `apple-app-site-association` et `assetlinks.json`, et page web de repli avec les liens vers les stores.

## Critères d'acceptation
- Taper « @lea » ouvre l'onglet Membres et trouve @lea.m.
- Scanner le QR de mon profil depuis un autre téléphone ouvre mon profil.
- Ouvrir un lien d'invitation sans être connecté → connexion → onboarding → profil de l'invitant.
