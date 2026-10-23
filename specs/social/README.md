# Zabava — Spec de développement : fonctionnalité sociale (V1 « Suivre des utilisateurs »)

Ce dossier ne couvre **que la partie sociale**. Il est fait pour être donné à Claude Code, qui l'ajoutera à l'application Zabava **déjà développée**.

## Point important : le design de l'app a changé
L'app réelle n'a plus exactement le design du prototype. Cette spec ne donne donc **aucune couleur en hexadécimal**. Elle décrit :
- les **rôles** visuels (accent, surface, texte secondaire…), à faire correspondre aux tokens de l'app existante (`docs/03-composants.md` §0) ;
- les **tailles, espacements et comportements**, qui font partie de la spec ;
- les **composants à réutiliser** de l'app (affiche, onglets, contrôle segmenté, chips, bottom sheet, toast, dialogue, interrupteur, bouton). **Ne recrée pas un composant qui existe déjà dans le code.**

Les captures de `captures/` montrent la structure des écrans sociaux, pas l'apparence finale (couleurs, typo et affiches sont celles du prototype).

## Ordre de lecture
| Fichier | Contenu |
|---|---|
| `CLAUDE.md` | Consignes pour Claude Code (à ajouter au CLAUDE.md du dépôt) |
| `docs/01-perimetre-et-regles.md` | Périmètre, pseudo, visibilité, règles de suivi, blocage, signalement, anti-spoiler |
| `docs/02-navigation.md` | Où le social s'insère, nouvelles routes, matrice des liens, liens profonds |
| `docs/03-composants.md` | Rôles visuels, nouveaux composants avec mesures et états |
| `docs/04-ecrans.md` | Les 14 écrans et états, bloc par bloc |
| `docs/05-textes-et-etats.md` | Tous les textes : toasts, états vides, erreurs, hors ligne, notifications |
| `docs/06-donnees-et-api.md` | Migration SQL, RLS, endpoints, écriture des activités, notifications push |
| `docs/07-logique-client.md` | Algorithmes (titres en commun, tri, fil, blocs de fiche), cache, mutations optimistes |
| `etapes/` | Plan de réalisation en 7 étapes, avec critères d'acceptation |
| `captures/` | 15 captures des écrans sociaux uniquement (structure de référence) |
| `reference/` | Spec PDF d'origine et logique sociale du prototype (`social.js`) |

## Ce que la V1 ajoute
- Un **pseudo unique** (`@pseudo`) par utilisateur, choisi à l'onboarding.
- **Suivre** quelqu'un en 1 tap (asymétrique, comme Letterboxd), avec **demande** si son profil est privé.
- Trouver quelqu'un par son **@pseudo**, par un **lien** ou un **QR code**.
- Un **profil** consultable : listes, abonnés, abonnements.
- Sur chaque fiche : **ce qu'en ont fait mes abonnements** et **quelques profils qui l'ont vu**.
- Un **fil d'activité** simple des gens que je suis.
- **Bloquer** et **signaler**.

Hors périmètre : commentaires, réactions, messages, partage vers les réseaux sociaux, notes personnelles, synchronisation des contacts, suggestions automatiques de profils, notification pour chaque activité.

## Fichiers de référence
- `reference/spec-social.pdf` : la spécification produit d'origine (source de vérité fonctionnelle).
- `reference/social.js` : **toute la logique sociale du prototype**. C'est la référence pour les algorithmes ; porte-les en TypeScript. Les fonctions qu'il appelle sans les définir (`A.sInfo`, `A.sec`, `A.isW`, `A.epTitle`, `A.pv`, `A.open`, `A.push`, `A.toast`) correspondent à des fonctions **déjà présentes dans l'app** : infos de progression d'une série, section de la watchlist, épisode vu, titre d'épisode, affiche, ouverture d'une fiche, navigation, toast.

## Captures (`captures/`)
01 onboarding, pseudo disponible · 02 pseudo déjà pris avec propositions · 03 Mon profil, Films › Vus · 04 sheet Inviter avec QR code · 05 mes abonnés · 06 Découvrir avec le carrousel d'activité · 07 fil d'activité · 08 recherche, onglet Membres · 09 profil suivi, Séries › En cours · 10 profil privé non suivi · 11 fiche film avec « Tes abonnements » et « Ils l'ont vu » · 12 sheet Tes abonnements · 13 réglages, section Confidentialité · 14 demandes d'abonnement · 15 fil avec l'anti-spoiler actif.

Les états vides ne sont pas en capture : leurs textes sont dans `docs/05`.

## Décisions prises pendant le prototypage (en plus du PDF)
1. Pas de rouge pour « Déjà pris » ni « Débloquer » : on utilise le style neutre, comme pour les autres actions destructives de l'app. Si l'app a un rôle « danger », tu peux l'utiliser pour ces deux cas.
2. Une activité « a vu un épisode » montre la **vignette de l'épisode** et son titre entre guillemets, sauf si l'anti-spoiler la masque. Elle montre alors l'**affiche de la série**, sans titre d'épisode.
3. Dans la recherche sans saisie, une ligne **« Chercher un membre »** ouvre directement l'onglet Membres (sinon il ne serait accessible qu'en tapant « @ »).
4. Les toasts « Annuler » s'appliquent aussi au social : se désabonner et retirer un abonné.
5. Le domaine des liens n'est pas encore choisi (question ouverte du PDF). La spec utilise `{DOMAINE}`, à mettre dans la configuration (`EXPO_PUBLIC_INVITE_DOMAIN`).
