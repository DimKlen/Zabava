# 01 — Périmètre et règles

## 1. Modifications de la spec principale
- Section « Exclus » : « amis » et « profils publics » ne sont plus exclus. Commentaires, réactions et partage social restent exclus.
- Onglet **Profil** : il devient « mon profil ». Les réglages actuels passent derrière une icône engrenage.
- **Recherche** : nouvel onglet « Membres ».
- **Notifications** : trois nouveaux types (nouvel abonné, demande d'abonnement, demande acceptée).
- **Onboarding** : nouvelle première étape « Choisis ton pseudo », soit 4 étapes au lieu de 3.
- Zabava n'a pas de note personnelle : les profils mis en avant sur une fiche sont choisis parmi ceux qui **ont vu** le titre.

## 2. Pseudo
- 3 à 20 caractères : lettres minuscules sans accent (`a-z`), chiffres, point `.` et tiret bas `_`. Regex : `^[a-z0-9._]{3,20}$`.
- Unique, sans distinction de casse (colonne `citext`).
- **Saisie nettoyée en direct** : passage en minuscules, suppression des accents (NFD puis retrait des diacritiques), suppression des caractères interdits, coupure à 20 caractères.
- **Proposé automatiquement** à partir du nom OAuth : prénom + initiale du nom, en minuscules, sans accent, séparés par un point (ex. « Dim Kovac » → `dim.k`). S'il est pris, on teste dans l'ordre `{base}.tv`, `{base}_26`, `{base}.zab`, `{base}2`, `{base}.film`, puis `{base}{n}` (n = 3, 4…).
- **Réservés** : `admin`, `zabava`, `support`, et les noms de routes de l'app (`login`, `search`, `title`, `person`, `genre`, `settings`, `onboarding`, `discover`, `upcoming`, `profile`, `watchlist`, `feed`, `me`, `u`).
- Modifiable **une fois tous les 30 jours**. L'ancien pseudo reste réservé 30 jours, et les liens `/u/{ancien}` redirigent vers le nouveau pendant ce temps.
- **Utilisateurs existants** (comptes créés avant la mise à jour) : l'écran « Choisis ton pseudo » s'affiche une fois, en plein écran, au premier lancement après la mise à jour, tant que `profiles.username` est nul.

## 3. Visibilité du profil
Public par défaut. Réglable dans Réglages › Confidentialité et dans Modifier le profil.

| Élément | Public | Privé, non abonné | Privé, abonné accepté | Moi |
|---|---|---|---|---|
| Avatar, nom, @pseudo | Visible | Visible | Visible | — |
| Nombres d'abonnés et d'abonnements | Visible | Visible | Visible | — |
| Listes d'abonnés et d'abonnements | Visible | **Masqué** | Visible | — |
| Listes de titres (films, séries, animés) | Visible | **Masqué** | Visible | — |
| Activité dans le fil | Visible par ses abonnés | Masqué | Visible | — |
| Apparition dans « Ils l'ont vu » | Oui | Non | **Non** | jamais moi |
| Apparition dans « Tes abonnements » d'une fiche | si je le suis | — | Oui | — |
| Action Suivre | Immédiat | Demande à accepter | — | — |

- Passer de **public à privé** : les abonnés existants restent abonnés.
- Passer de **privé à public** : les demandes en attente sont **acceptées automatiquement** (toast « {n} demandes acceptées automatiquement »).

## 4. Règles de suivi
- Suivi **asymétrique** : je peux suivre quelqu'un qui ne me suit pas.
- **Suivre** : immédiat si le profil est public. Sinon, une demande `pending` est créée.
- **Annuler une demande** : un tap sur « Demandé ».
- **Se désabonner** : immédiat, l'autre personne n'est pas prévenue.
- **Retirer un abonné** : depuis ma liste d'abonnés ou le menu « … » de son profil, sans le prévenir.
- **Refuser une demande** : la personne n'est pas prévenue et la demande disparaît. Elle peut en renvoyer une.
- **Limite anti-abus** : 200 nouveaux abonnements (et demandes) par jour et par utilisateur. Au-delà, l'API répond `429` et l'app affiche « Tu as atteint la limite de 200 abonnements par jour ».
- On ne peut pas se suivre soi-même (contrainte en base).

## 5. Bloquer
- Retire l'abonnement **dans les deux sens** et supprime les demandes en attente entre les deux comptes.
- Empêche de se suivre tant que le blocage existe (l'API répond `403`).
- Masque chacun **dans les recherches, les fiches, les listes d'abonnés et d'abonnements et le fil** de l'autre.
- Un lien vers le profil de quelqu'un qui m'a bloqué affiche « Ce profil n'existe pas ou n'est plus disponible ».
- La personne bloquée n'est pas prévenue.
- Débloquer ne rétablit pas les anciens abonnements.

## 6. Signaler
Depuis le menu « … » d'un profil. Motifs : **Pseudo ou avatar inapproprié**, **Usurpation d'identité**, **Spam**. Le signalement est enregistré dans `reports` et envoyé par courriel à l'équipe. Toast « Signalement envoyé, merci ». Un même utilisateur ne peut signaler un profil qu'une fois par motif (contrainte unique).

## 7. Anti-spoiler dans le social
- Si **mon** anti-spoiler est actif, une activité d'un autre sur un épisode **que je n'ai pas vu** affiche « a vu S03 E04 de {Série} », sans titre ni vignette d'épisode. À la place de la vignette, on montre l'affiche de la série.
- Mon anti-spoiler ne masque jamais mes listes aux autres : il ne concerne que ce que **je** vois.
- Les regroupements « a vu 5 épisodes de {Série} » ne contiennent jamais de titre d'épisode.

## 8. Titres en commun
Nombre de titres que les deux utilisateurs ont **vus, en cours ou terminés** :
- film au statut Vu ;
- série ou animé avec au moins un épisode vu et non abandonné (donc en cours ou terminé).
Un titre seulement « à voir » ne compte pas. Affiché quand la valeur est **≥ 3** : chip du profil, lignes de membres, recherche. Les cartes « Ils l'ont vu » l'affichent toujours.
