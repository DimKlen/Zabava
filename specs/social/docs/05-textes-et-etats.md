# 05 — Textes, toasts, états

Français fr-CA, tutoiement. Reprendre **mot pour mot**.

## 1. Toasts
Même composant et même durée que les toasts existants.

| Action | Message | Annuler |
|---|---|---|
| suivre un profil public | (aucun toast, le bouton change) | — |
| suivre un profil privé | Demande envoyée à @{pseudo} | non |
| annuler une demande | Demande annulée | non |
| se désabonner | Tu ne suis plus @{pseudo} | **oui** (se réabonne ; redevient une demande si le profil est privé) |
| retirer un abonné | @{pseudo} ne te suit plus | **oui** |
| bloquer | @{pseudo} est bloqué·e | non |
| débloquer | @{pseudo} est débloqué·e | non |
| signaler | Signalement envoyé, merci | non |
| accepter une demande | {Prénom} te suit maintenant | non |
| tout accepter | {n} demandes acceptées | non |
| privé → public avec des demandes | {n} demandes acceptées automatiquement (« 1 demande acceptée automatiquement ») | non |
| copier un lien | Lien copié | non |
| profil enregistré | Profil mis à jour | non |
| action sociale hors ligne | Connexion requise | non |
| limite de 200 par jour | Tu as atteint la limite de 200 abonnements par jour | non |
| échec d'une action optimiste | Impossible d'enregistrer, réessaie | non |
| compteurs d'un profil privé | Ce profil est privé | non |
| compteurs d'un profil bloqué | Tu as bloqué ce profil | non |
| QR non reconnu | Ce code n'est pas un code Zabava | non |

## 2. États vides
| Écran | Texte | Bouton |
|---|---|---|
| Mes abonnements | Tu ne suis personne pour l'instant | Trouver des membres |
| Mes abonnés | Personne ne te suit encore | Inviter |
| Abonnés / abonnements d'un autre | Rien ici pour l'instant | — |
| Filtre d'une liste | Aucun membre ne correspond | — |
| Listes d'un profil (onglet + segment vide) | Rien ici pour l'instant | — |
| Fil d'activité | Suis des membres pour voir ce qu'ils regardent | Trouver des membres |
| Carrousel de Découvrir | (masqué) | — |
| Demandes | Aucune demande | — |
| Comptes bloqués | Aucun compte bloqué | — |
| Recherche › Membres, aucun résultat | Aucun membre trouvé | Inviter quelqu'un |
| Recherche › Membres, moins de 2 caractères et aucun profil visité | Tape au moins 2 caractères du pseudo ou du nom. | — |

## 3. Autres états
| Cas | Affichage |
|---|---|
| Profil privé non suivi | Ce profil est privé · Suis @{pseudo} pour voir ses listes |
| Profil bloqué par moi | Tu as bloqué ce profil · Débloque-le pour voir ses listes et vous suivre à nouveau. |
| Profil introuvable, supprimé, ou qui m'a bloqué (lien) | Ce profil n'existe pas ou n'est plus disponible · bouton Retour |
| Pseudo : vérification | Vérification… (+ indicateur dans le champ) |
| Pseudo : disponible | Disponible |
| Pseudo : pris | Déjà pris. Essaie plutôt : + 3 propositions |
| Pseudo : invalide | 3 à 20 caractères : lettres minuscules, chiffres, point et tiret bas. |
| Pseudo : pas de réseau | Vérification impossible, réessaie |
| Pseudo : changement trop récent | Tu pourras changer de pseudo à partir du {d MMMM} |
| Caméra refusée | Autorise l'accès à la caméra pour scanner un code. · Ouvrir les réglages |
| Erreur de chargement d'une liste | composant d'erreur existant (« Impossible de charger » + « Réessayer ») |
| Chargement | squelettes de l'app (affiches, lignes de 60 avec un cercle de 44), jamais de spinner plein écran |

## 4. Hors ligne
- Suivre, se désabonner, annuler une demande, accepter ou refuser, bloquer, débloquer, retirer un abonné, signaler, modifier le profil : **désactivés**, toast « Connexion requise ».
- Lecture depuis le cache : mon profil, profils déjà visités, fil, blocs sociaux des fiches déjà ouvertes.
- La recherche reste indisponible hors ligne (comportement existant).

## 5. Notifications push
| Type | Déclencheur | Texte | Tap |
|---|---|---|---|
| Nouvel abonné | quelqu'un me suit (mon profil est public) | **Léa (@lea.m) te suit** | profil de Léa |
| Nouveaux abonnés groupés | plus de 3 nouveaux abonnés en moins d'une heure | **Léa et 4 autres te suivent** | ma liste d'abonnés |
| Demande d'abonnement | quelqu'un demande à me suivre (profil privé) | **Léa (@lea.m) veut te suivre** | Demandes |
| Demande acceptée | ma demande est acceptée | **Léa a accepté ta demande** | profil de Léa |
- Interrupteurs : « Nouvel abonné » couvre Nouvel abonné et ses regroupements ; « Demandes d'abonnement » couvre Demande d'abonnement et Demande acceptée.
- Pas de notification pour se désabonner, retirer un abonné, refuser, bloquer, ni pour l'activité des abonnements.
- Une seule notification « nouvel abonné » par paire de comptes et par 24 h, même en cas d'abonnement, désabonnement puis réabonnement.
