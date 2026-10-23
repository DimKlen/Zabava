# Étape 7 — États, accessibilité, vérification

## Tâches
1. Squelettes, erreurs « Réessayer », états vides et textes exacts (`docs/05`) sur chaque nouvel écran.
2. Accessibilité : libellés (« Suivre @lea.m », « Abonné à @lea.m, toucher pour se désabonner »), rôles, zones de 44 pt, taille de police dynamique.
3. Retour Android : ferme la sheet ouverte avant de dépiler.
4. Performance : listes virtualisées, images d'avatar en cache, aucun recalcul de `commonCount` côté client.
5. Revue de confidentialité : vérifier chaque endpoint avec un compte privé, un compte bloqué et un compte bloquant.
6. Comparer chaque écran avec la structure des captures (`captures/`) et avec les textes des docs.

## Critères d'acceptation
- Aucun texte de l'interface ne diffère des docs.
- Aucune donnée d'un profil privé non suivi n'est visible dans les réponses réseau.
- `tsc`, lint et tests passent côté mobile et backend.
