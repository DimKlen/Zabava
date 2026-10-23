# Étape 6 — Demandes, confidentialité, notifications

Référence : `docs/04` §4.12 à 4.14, `docs/05` §5, `docs/06` §5.

## Tâches
1. Écran Demandes (accepter, refuser, tout accepter) ; ligne et badge sur Mon profil.
2. Réglages : section Confidentialité, comptes bloqués, 2 interrupteurs de notification.
3. Passage de privé à public (acceptation automatique et toast).
4. Backend : notifications Nouvel abonné (et groupées), Demande d'abonnement, Demande acceptée ; dédoublonnage ; préférences.
5. Ouverture des notifications vers les bonnes destinations.

## Critères d'acceptation
- 5 abonnements reçus en 10 minutes donnent une seule notification « Léa et 4 autres te suivent ».
- Couper « Nouvel abonné » arrête ces notifications.
- La ligne « Demandes d'abonnement » n'apparaît que si le profil est privé et qu'il y a au moins une demande.
