# 09 — À venir et Profil

## 9.1 À venir (`/(tabs)/upcoming`)

### Mise en page
1. Titre **« À venir »** (hauteur 52, padding `8 16 0`).
2. Chips (padding `4 16 0`, padding horizontal 14) : **Tout** (défaut) · **Films** · **Séries** · **Animés**.
3. **Bande de la semaine**, collée en haut à l'intérieur du défilement (`stickyHeaderIndices`), fond `bg`, padding `12 12 8`, grille de 7 colonnes égales, gap 4. Jours : aujourd'hui + 6.
   - Bouton jour : colonne centrée, gap 2, padding vertical 6, rayon 10.
   - Jour de la semaine abrégé (sans point, première lettre en majuscule : « Sam », « Dim », « Lun »…) 11 `neutral500` ; numéro 16/500 ; point 5 × 5 rond, `accent` s'il y a au moins un événement ce jour-là (avec le filtre actif), sinon transparent.
   - Aujourd'hui : fond `accent900`, numéro `accent200`. Autres jours : fond transparent, numéro `text`.
   - Tap → défilement animé jusqu'au premier groupe dont le jour est ≥ le jour touché (position du groupe − 72). Aucun → toast **« Rien de prévu à partir de ce jour »**.
4. **Groupes par jour** (padding `12 16 0`), sur **90 jours** à partir d'aujourd'hui :
   - libellé 13/500 `accent300`, première lettre en majuscule, marge basse 6 : **« Aujourd'hui »**, **« Demain »**, puis `{jour abrégé}. {d} {mois abrégé}` (ex. « Mer. 14 oct. ») ;
   - éléments en colonne, gap 6. Élément : rangée gap 12, padding 8, rayon 12, fond `surface`, pression scale 0.99 :
     - mini-affiche 40 × 60, rayon 6 ;
     - colonne : titre 15/500 (1 ligne) · ligne 13 `neutral400` ;
     - à droite, si présent, `.tag-neutral` avec la plateforme.
   - Contenu selon le type d'événement :
     | Événement | Ligne | Tag |
     |---|---|---|
     | Épisode | `S03 E04 · 21 h 00` (heure locale) | plateforme ou chaîne |
     | Film, sortie en salle | **Sortie en salle** | **Cinéma** |
     | Film, arrivée en streaming | **Arrive sur {plateforme}** | — |
     | Film, sortie numérique | **Disponible en numérique** | — |
   - Tap → fiche.
   - Ordre dans un jour : par heure, puis par titre.
5. **Sans date** (repliée par défaut) : padding `16 16 0`, en-tête bouton pleine largeur (hauteur min 44) : « Sans date » 15/500 + caret `neutral500` à droite. Éléments (même style, sans tag) : séries suivies en cours de production qui n'ont **aucun** épisode daté. Ligne : **« Saison {n+1} annoncée, date à venir »**.

### Règles d'inclusion
- Films : seulement les films de la watchlist au statut **À voir**.
- Séries/animés : seulement les titres **suivis** (pas abandonnés), épisodes diffusés après maintenant et dans les 90 jours.
- Les épisodes déjà vus ne sont jamais listés.
- Anti-spoiler : pas de titre d'épisode ici, donc aucun effet.

### États
- Chargement : 4 squelettes d'élément (hauteur 76, rayon 12, gap 6).
- Vide (aucun événement et aucun « Sans date ») : padding `48 24`, CalendarBlank 40 · **« Rien de prévu »** · bouton 44 **« Suivre des séries »** → Découvrir › Séries.
- Hors ligne : affiché depuis le cache.
- Données : `GET /me/upcoming?from={aujourd'hui}&to={+90 j}&type=all|movie|tv|anime`.

## 9.2 Profil (`/(tabs)/profile`)

### Mise en page
1. Titre **« Profil »** (hauteur 52).
2. **Compte** : rangée gap 14, padding `12 16 4`. Avatar 56 rond : photo OAuth si elle existe, sinon fond `accent800`, initiale 20/500 `accent100`. Colonne : nom 17/500 · `{email} · {Apple|Google}` 13 `neutral400`.
3. Groupes (padding `16 16 0`, colonne gap 20). Chaque groupe : h6 (marge basse 8) puis un conteneur (colonne, gap 1, fond `neutral900`, rayon 12, `overflow hidden`) dont chaque ligne a une hauteur min de 50, un padding horizontal de 14, un fond `surface` et une rangée centrée gap 12 (icône 20 `neutral400` s'il y en a une, libellé flex 1 en 15 pt `text`, valeur à droite).

**PRÉFÉRENCES**
| Ligne | Icône | Valeur | Action |
|---|---|---|---|
| **Région** | Globe | nom de la région, 14 `neutral300`, + CaretDown | ActionSheet des régions → `PUT /me/profile` ; rafraîchit plateformes et dates partout |
| **Langue** | Translate | ex. « Français (fr-CA) » + CaretDown | ActionSheet des langues → `PUT /me/profile` |
| **Mes plateformes** | TelevisionSimple | noms séparés par « , », 13 `neutral400`, 1 ligne, largeur max 150, + CaretRight `neutral600` ; « Aucune » si vide | PlatformsSheet |
| **Anti-spoiler** | ShieldCheck | Switch | `PUT /me/profile {spoiler_protection}` |

**NOTIFICATIONS** (sans icônes)
| Ligne | Contrôle |
|---|---|
| **Nouveaux épisodes** | Switch |
| **Sorties en salle** | Switch |
| **Disponibilité en streaming** | Switch |
| **Nouvelles saisons** | Switch |
| **Récapitulatif quotidien** | heure (« 8 h », « 9 h », « 12 h », « 18 h », « 20 h »), 14 `neutral300`, + CaretDown → ActionSheet. Défaut **9 h** |
- Activer un interrupteur alors que la permission système est refusée : ouvrir la demande système ; si elle est bloquée, `Linking.openSettings()`.
- Enregistré dans `profiles.notification_prefs` (jsonb) : `{ "episodes": true, "cinema": true, "streaming": true, "seasons": true, "digest_hour": 9 }`.

**À PROPOS** : carte (padding 14, rayon 12, fond `surface`, colonne gap 10) :
- rangée gap 8 : logos officiels TMDB et JustWatch (hauteur 22 ; le prototype montre `.tag-outline` « TMDB » et « JustWatch » à cet emplacement) ;
- texte 13 `neutral400` : **« Ce produit utilise l'API TMDB sans être approuvé ni certifié par TMDB. Plateformes de diffusion fournies par JustWatch. Notes via OMDb. »**
- **« Version {version} »** 12 `neutral500` (depuis `expo-constants`).
4. **Actions** (colonne gap 8, padding bas 12) :
   - bouton secondaire 46, icône SignOut 18 : **« Se déconnecter »** → Dialog **« Se déconnecter ? »**, corps **« Ta liste reste sauvegardée sur ton compte. »**, boutons **Annuler** (secondaire) · **Se déconnecter** (principal) → `supabase.auth.signOut()`, vide le cache et le jeton push, `router.replace('/login')` ;
   - bouton ghost 44, texte `neutral400` : **« Supprimer mon compte »** → Dialog **« Supprimer ton compte ? »**, corps **« Ta liste, ton suivi d'épisodes et tes réglages seront effacés définitivement. »**, boutons **Annuler** · **Supprimer** → `DELETE /me`, puis déconnexion et `/login`. Obligatoire pour l'App Store.

### PlatformsSheet
BottomSheet, padding `12 16 34`, entrée 250 ms.
- En-tête `space-between`, marge basse 12 : **« Mes plateformes »** 18/500 · bouton principal 36 **« OK »** (ferme).
- Grille de 4 colonnes, gap 8 : tuiles comme à l'onboarding, en plus compact (padding `12 4 10`, pastille 36 avec texte 12/600, nom 11, pas de badge de coche ; sélection = bord `accent` + fond `accent900`).
- Chaque tap enregistre tout de suite (`PUT /me/providers`, optimiste).
