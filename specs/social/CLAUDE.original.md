# Consignes Claude Code — fonctionnalité sociale Zabava

Ajoute ce bloc au `CLAUDE.md` du dépôt Zabava existant. Le dossier `design_handoff_zabava_social/` doit se trouver à la racine du dépôt.

## Avant d'écrire du code
1. Lis `README.md`, puis les docs `01` à `07` dans l'ordre.
2. **Explore le code existant** et note dans `design_handoff_zabava_social/MAPPING.md` :
   - les tokens de thème réels qui correspondent aux rôles de `docs/03` §0 (accent, onAccent, bg, surface, surface2, textPrimary, textSecondary, textTertiary, divider, danger s'il existe) ;
   - les composants existants à réutiliser : affiche (poster) avec bouton +/coche, onglets soulignés, contrôle segmenté, chip, bottom sheet / action sheet, dialogue, toast avec « Annuler », interrupteur, bouton (primaire / secondaire / ghost), squelette, état vide, bandeau hors ligne ;
   - la structure des routes, du store, du client HTTP, des hooks de requêtes et de la file de mutations hors ligne ;
   - le fonctionnement de l'anti-spoiler et de la liste de l'utilisateur (statuts, épisodes vus).
3. Réalise ensuite `etapes/` **une étape à la fois, dans l'ordre**. Vérifie chaque critère d'acceptation avant de passer à la suivante.

## Règles
- **Aucune régression** : l'existant (tab bar à 4 onglets, Ma liste, fiches, À venir, notifications actuelles) ne change que là où `docs/02` le demande.
- **Réutilise** les composants et tokens de l'app. Aucun hex en dur. Les nouveaux composants (`docs/03`) sont construits avec les primitives existantes.
- **Textes** : reprends mot pour mot ceux de `docs/04` et `docs/05` (français fr-CA, tutoiement).
- **Zones tactiles** de 44 pt minimum, même pour les boutons compacts de 32 pt (agrandis la zone avec `hitSlop`).
- **Optimiste** : suivre, se désabonner, accepter ou refuser une demande, bloquer et retirer un abonné mettent l'interface à jour immédiatement. En cas d'échec, l'interface revient en arrière et affiche « Impossible d'enregistrer, réessaie ».
- **Hors ligne** : ces actions sociales sont **refusées** (toast « Connexion requise »), contrairement au cochage d'épisodes. Le fil et les profils déjà chargés restent lisibles depuis le cache.
- **Confidentialité côté serveur** : les règles de visibilité (`docs/01` §3) sont appliquées **par le backend**. Le client ne reçoit jamais de données qu'il n'a pas le droit d'afficher.
- **Anti-spoiler** : c'est **mon** réglage qui s'applique à l'activité des autres (`docs/01` §7).
- **Logique pure dans `domain/`** avec tests unitaires (`docs/07`).
