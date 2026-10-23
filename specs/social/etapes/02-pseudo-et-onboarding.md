# Étape 2 — Pseudo, onboarding, comptes existants

Référence : `docs/04` §4.1, `docs/03` UsernameField, `docs/01` §2.

## Tâches
1. `domain/social/username.ts` et ses tests.
2. Composant UsernameField (vérification à 300 ms, réponses obsolètes ignorées, propositions).
3. Nouvelle 1re étape d'onboarding ; barre de progression à 4 segments ; pas de « Passer » ni de retour sur cette étape.
4. Écran `username-required` pour les comptes existants sans pseudo (garde de navigation au démarrage).

## Critères d'acceptation
- Nouveau compte : pseudo → région → plateformes → titres → notifications.
- Taper « Éloïse » affiche `eloise` ; un pseudo pris affiche « Déjà pris » et 3 propositions disponibles.
- « Continuer » est inactif tant que le pseudo n'est pas disponible.
- Un compte existant sans pseudo voit l'écran une seule fois.
