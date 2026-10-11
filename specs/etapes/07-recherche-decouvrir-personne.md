# Étape 7 — Recherche, recherche avancée, Découvrir, personne, genre

**Référence** : `docs/08`, `docs/07` §7.3–7.4.

## Tâches
1. Écran de recherche : focus automatique, délai de 300 ms, annulation des requêtes, récentes persistées, tendances, onglets, lignes titre et personne, squelettes, état sans résultat.
2. AdvancedSearchSheet : tous les filtres, autocomplétion des acteurs, compteur en direct, mode « recherche avancée appliquée ».
3. Découvrir : 3 onglets, carrousels (`docs/08` §8.3), grille Par genre.
4. Fiche personne (filmographie, tri) et liste par genre (pagination infinie).

## Critères d'acceptation
- Taper « zen » montre Zendaya dans Tout et dans Personnes.
- Deux acteurs choisis → seuls les titres où ils jouent ensemble.
- Le compteur « Voir les N résultats » change à chaque filtre et respecte le singulier et le zéro.
- Hors ligne : la loupe affiche le toast et Découvrir affiche son état hors ligne.
