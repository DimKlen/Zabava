# 01 — Produit et règles métier

Sources : `reference/spec.pdf` (§1, §5, §6, §9) et le comportement du prototype (`reference/app.js`). En cas de doute, ce document tranche.

## 1. Périmètre

### Inclus
- Connexion OAuth (Google, Apple) dès l'ouverture.
- Watchlist en page d'accueil, avec trois onglets : **Films** (par défaut), **Séries**, **Animés**.
- Recherche par titre et par personne, recherche avancée (acteurs, genres, années, note, plateforme, langue, durée, tri), page Découvrir.
- Fiches détaillées : synopsis, casting, notes IMDb et Rotten Tomatoes, plateformes de diffusion, statut en salle, bande-annonce, saga, titres similaires.
- Suivi des séries épisode par épisode ou par saison entière, avec le prochain épisode à regarder.
- Liste « À venir » : épisodes des séries suivies, sorties en salle et sorties streaming des films de la watchlist, sur 90 jours.
- Notifications le jour de diffusion d'un épisode, à la sortie en salle, à l'arrivée en streaming et à l'annonce d'une nouvelle saison.

### Exclus
- Statistiques (temps passé, compteurs, graphiques).
- Commentaires, réactions, amis, profils publics, partage.
- Lecture vidéo dans l'app : on ouvre la plateforme ou YouTube.
- Revisionnages.

### Principes
- **Ajouter un titre en 2 taps maximum**, depuis n'importe quelle liste : bouton « + » sur chaque affiche et sur chaque ligne de résultat.
- **Cocher un épisode depuis la watchlist**, sans ouvrir la fiche.
- **Anti-spoiler** sur les épisodes non vus (désactivé par défaut, réglable dans Profil).
- **Région par défaut Canada, langue Français (fr-CA)**, modifiables. Elles déterminent les plateformes et les dates de sortie affichées.
- **Toute action réversible** affiche un toast de 5 s avec « Annuler ».

## 2. Types de titres
- `movie` → onglet Films.
- `tv` → onglet Séries.
- `anime` → onglet Animés. Un titre est classé animé s'il a le genre Animation **et** soit le Japon comme pays d'origine, soit le mot-clé TMDB « anime » (keyword id 210024). Il n'apparaît alors ni dans Séries ni dans Films. Un film d'animation américain (ex. *KPop Demon Hunters*) reste dans Films.

Libellés de type affichés : `Film`, `Série`, `Animé`.

## 3. Statuts utilisateur

### Film
| Statut | Stockage | Signification |
|---|---|---|
| À voir | `user_titles.status = 'towatch'` | dans la watchlist, pas vu |
| Vu | `status = 'watched'`, `watched_at` | vu, avec date |
| (absent) | pas de ligne | hors liste |

- « Marquer comme vu » sur un film hors liste l'ajoute directement en Vu.
- « Marquer comme non vu » remet le film en À voir.
- « Retirer de ma liste » supprime la ligne.

### Série / animé
Stockage : `status = 'following'` ou `'abandoned'`. Tous les autres statuts sont **calculés**.

Algorithme de section (porter tel quel `A.sec` de `app.js`) :
```
si pas de ligne user_titles         → null (hors liste)
si status = 'abandoned'             → 'abandoned'   « Abandonnées »
w = nombre d'épisodes diffusés vus
si w = 0                            → 'notstarted'  « Pas encore commencées »
si un épisode diffusé non vu existe :
    si dernier visionnage > 30 jours → 'stale'      « Pas regardé depuis un moment »
    sinon                            → 'watch'      « À regarder »
sinon (tout vu) :
    si série terminée ou annulée     → 'done'       « Terminées »
    sinon                            → 'uptodate'   « À jour »
```
- « Dernier visionnage » = `max(user_episodes.watched_at)` pour ce titre. Si aucun épisode n'est vu, la valeur est infinie.
- Les épisodes spéciaux (saison 0) sont **ignorés** dans tous ces calculs.
- Un titre abandonné ne génère plus de notifications et n'apparaît pas dans À venir.

### Prochain épisode
Premier épisode **déjà diffusé** (`airstamp <= maintenant`) et **non vu**, dans l'ordre (saison, numéro), saison 0 exclue.

### Épisodes restants
`restants = nb épisodes diffusés − nb épisodes diffusés vus`. Libellé : `« {n} épisodes restants »` si n > 1, sinon `« Dernier épisode disponible »`.

### Progression (barre de la carte)
`pct = round(vus diffusés / diffusés × 100)`.

## 4. Cochage
- Toucher la coche d'un épisode non vu le marque vu (`watched_at = now()`) et met « dernier visionnage » à maintenant.
- Si des épisodes **diffusés** antérieurs ne sont pas vus, afficher le dialogue :
  - Titre : `« Marquer aussi l'épisode précédent ? »` (1 épisode) ou `« Marquer aussi les {n} épisodes précédents ? »`.
  - Boutons : `Seulement celui-ci` (secondaire) · `Oui` (principal).
  - Exception : la coche de la carte « prochain épisode » ne déclenche jamais ce dialogue, puisque c'est par définition le premier non vu.
- Toucher un épisode déjà vu le **décoche** (toast « Épisode décoché » avec Annuler).
- « Tout marquer comme vu » sur une saison coche **uniquement les épisodes déjà diffusés**. Si tous les épisodes diffusés de la saison sont vus, le bouton affiche « Saison vue » et un tap les décoche tous.
- Cocher un épisode d'une série hors liste l'ajoute automatiquement en `following`.
- Le cochage fonctionne hors ligne et se synchronise au retour du réseau.
- Retour haptique : `Haptics.impactAsync(Light)` à chaque coche (pas au décochage).

## 5. Disponibilité d'un film (pour la région de l'utilisateur)
Algorithme (`A.mState`) :
```
si date de sortie en salle (région) > aujourd'hui      → 'upcoming'  « Pas encore sorti »
si au moins une offre Abonnement, Location ou Achat    → 'avail'     « Disponible »
si sortie en salle il y a moins de 60 jours            → 'cinema'    « Au cinéma »
sinon                                                  → 'unknown'
```
« Au cinéma » est une estimation : aucune source gratuite ne fournit les séances réelles.

### Badge d'affiche (`A.badge`)
- Film `upcoming` → date courte de sortie, ex. `18 déc.`
- Film `cinema` → `Au cinéma` (variante mise en avant, voir composants).
- Film `avail` → nom de la plateforme prioritaire : 1) un abonnement chez une de mes plateformes, 2) le premier abonnement, 3) une location chez une de mes plateformes, 4) la première location, 5) le premier achat.
- Film `unknown` → pas de badge.
- Série/animé → nom de la plateforme ou chaîne d'origine.
- Pas de badge dans l'onboarding, dans les lignes compactes, ni sur l'affiche de l'en-tête des fiches.

### Bandeau de statut (fiche film)
| État | Texte | Icône |
|---|---|---|
| upcoming | `En salle le {d MMM}` | calendar-blank |
| cinema | `Au cinéma maintenant` | film-slate |
| avail + date numérique connue | `Disponible en numérique depuis le {d MMM}` | television-simple |
| avail sans date | `Disponible en streaming` | television-simple |
| unknown | `Pas encore de date` | question |

## 6. Anti-spoiler
Quand il est actif, pour chaque épisode **non vu** (diffusé ou non), partout (cartes, listes, fiche épisode, À venir, notifications) :
- le titre devient `Épisode {n}` ;
- la vignette est floutée (rayon 6 pt dans les listes, 10 pt dans la fiche épisode) ;
- le synopsis devient : `Synopsis masqué tant que l'épisode n'est pas vu (anti-spoiler).`

## 7. Notifications (spec §5)

| Type | Déclencheur | Exemple | Moment |
|---|---|---|---|
| Nouvel épisode | un épisode d'une série suivie (non abandonnée) est diffusé | `The Bear · S04 E03 est disponible` | à l'heure de diffusion locale ; 9 h si inconnue |
| Sortie en salle | un film de la watchlist (À voir) sort au cinéma dans la région | `Dune : Troisième partie sort au cinéma aujourd'hui` | 9 h le jour J |
| Disponible en streaming | un film de la watchlist arrive chez une plateforme d'abonnement de la région, ou sort en numérique | `Wicked : Pour de bon est maintenant sur Prime Video` | dès détection, entre 9 h et 21 h |
| Nouvelle saison | une date est annoncée ou une saison démarre pour une série « À jour » ou « Terminée » | `La saison 3 de Frieren commence le 9 janv.` | 9 h |

Règles :
- Au plus **une notification par titre et par jour**.
- À partir de **4 épisodes le même jour**, on regroupe : `5 nouveaux épisodes aujourd'hui`.
- « Disponible en streaming » ne part que pour **mes plateformes** si j'en ai choisi ; sinon pour toute plateforme d'abonnement.
- Anti-spoiler actif : le titre de l'épisode n'apparaît jamais (le format ci-dessus n'en contient de toute façon pas).
- Chaque type peut être coupé globalement (Profil) et chaque titre peut être coupé avec la cloche de sa fiche.
- Un tap sur la notification ouvre la fiche concernée (lien profond, voir `04-navigation.md`).
- `notifications_log` empêche tout envoi en double.

## 8. États d'interface (spec §9)
- **Chargement** : squelettes « shimmer » à la forme exacte des affiches, cartes et lignes. **Jamais de spinner plein écran.**
- **Vide** : icône, phrase, bouton d'action (textes exacts dans chaque écran).
- **Hors ligne** : bandeau en haut ; Ma liste et À venir lisibles depuis le cache ; cochage possible ; Recherche et Découvrir désactivés.
- **Erreur** : message et bouton « Réessayer » dans la zone concernée ; le reste de l'écran reste utilisable.
- **Donnée manquante** : affiche absente → affiche de remplacement (dégradé + titre) ; note absente → chip masquée ; aucune plateforme → `Disponibilité inconnue pour ta région.`

## 9. Question ouverte (spec)
Usage personnel ou publication commerciale ? La réponse détermine s'il faut une licence TMDB commerciale et l'offre payante d'OMDb. À trancher avant la mise en ligne sur les stores.
