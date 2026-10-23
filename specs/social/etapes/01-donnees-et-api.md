# Étape 1 — Base de données et API sociales

Référence : `docs/06`, `docs/01`.

## Tâches
1. Migration SQL complète (`docs/06` §1) avec les triggers de compteurs et la purge des activités de plus de 180 jours.
2. Endpoints de `docs/06` §3 dans un module `social` du backend, avec application stricte des règles de visibilité et de blocage.
3. Écriture des activités dans les endpoints existants (ajout, vu, cochage, retrait, décochage), avec regroupement des épisodes par jour.
4. Calcul de `commonCount` et de l'ordre de recherche ; limite de 200 abonnements par jour ; historique des pseudos.
5. Mettre à jour l'OpenAPI et régénérer les types TypeScript du client.

## Critères d'acceptation
- Tests d'intégration : un profil privé non suivi renvoie `403` sur `/titles` et `/followers` ; un utilisateur qui m'a bloqué renvoie `404` ; bloquer supprime les abonnements dans les deux sens.
- Cocher 5 épisodes de la même série le même jour crée **une** activité `count = 5`.
- Passer de privé à public accepte toutes les demandes.
- Le 201e abonnement du jour renvoie `429`.
