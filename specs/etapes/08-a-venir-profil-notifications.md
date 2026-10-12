# Étape 8 — À venir, Profil, notifications

**Référence** : `docs/09`, `docs/01` §7, `docs/11` §4.

## Tâches
1. `src/domain/upcoming.ts` + écran À venir : chips, bande de la semaine collante avec points et saut au jour, groupes sur 90 jours, Sans date, vide.
2. Profil : compte, préférences (Région, Langue, Mes plateformes + sheet, Anti-spoiler), notifications (4 interrupteurs + heure du récapitulatif), À propos avec les logos TMDB et JustWatch, déconnexion et suppression avec dialogues.
3. Anti-spoiler appliqué partout (`docs/01` §6).
4. Backend : les 4 tâches planifiées, `notifications_log`, regroupement, fenêtres horaires, Expo Push.
5. App : gestion du tap sur une notification (`Notifications.addNotificationResponseReceivedListener`) → lien profond (`docs/04` §4) ; reconstruction de la pile à froid.

## Critères d'acceptation
- Un épisode programmé dans 2 jours apparaît sous le bon jour, avec l'heure locale du téléphone.
- Changer la région met à jour les plateformes des fiches et les badges.
- Notification de test « Nouvel épisode » : le tap ouvre la fiche, la bonne saison, puis la fiche épisode.
- Jamais deux notifications pour le même titre le même jour.
