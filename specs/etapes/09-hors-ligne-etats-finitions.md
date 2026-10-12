# Étape 9 — Hors ligne, états, accessibilité, livraison

## Tâches
1. Persistance du cache de requêtes et des mutations ; bandeau hors ligne ; Ma liste et À venir lisibles ; cochage en file ; recherche et Découvrir désactivés.
2. Pour chaque écran : squelettes, vides, erreurs avec « Réessayer » (`docs/10` §8), données manquantes (`docs/01` §8).
3. Accessibilité : libellés, rôles (`button`, `switch`, `tab`), `accessibilityState`, cibles de 44 pt, prise en charge de la taille de police dynamique sans casser les mises en page (`maxFontSizeMultiplier 1.3`).
4. Retour Android (`docs/04` §3).
5. Performances : `FlatList` partout, `getItemLayout` dans les grilles, images en cache (expo-image `cachePolicy="memory-disk"`), 60 i/s pendant les swipes et les animations.
6. Comparaison visuelle finale avec le prototype, écran par écran (liste de `docs/04` §1) ; corriger tout écart.
7. EAS Build (profils development, preview, production), soumission TestFlight et Play interne. Vérifier les obligations des stores : Sign in with Apple, suppression du compte, attributions TMDB et JustWatch.

## Critères d'acceptation
- Mode avion : on coche 3 épisodes, on rallume, et tout est synchronisé sans doublon.
- Aucun spinner plein écran dans toute l'app.
- Tous les textes sont identiques à ceux des docs.
- Builds iOS et Android installables.
