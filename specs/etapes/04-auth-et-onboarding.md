# Étape 4 — Connexion et onboarding

**Référence** : `docs/05-ecrans-auth-onboarding.md`.

## Tâches
1. `src/api/supabase.ts` (session persistée dans AsyncStorage, rafraîchissement automatique). Client HTTP `src/api/http.ts` qui ajoute le JWT et redirige vers `/login` après un 401 suivi d'un échec de rafraîchissement.
2. `/login` : mosaïque animée, textes, boutons Apple et Google, états « Connexion en cours… », « Connexion annulée », « Impossible de se connecter, réessaie ».
3. Garde d'auth dans `app/index.tsx` (`docs/04` §2).
4. Onboarding : layout avec la barre de progression et « Passer » ; les 3 étapes ; le compteur de titres ; « Terminer ».
5. Écran d'explication des notifications, vraie demande de permission, enregistrement du jeton Expo et du fuseau.

## Critères d'acceptation
- Nouveau compte : login → région → plateformes → titres → notifications → Ma liste › Films.
- Compte existant : ouverture directe sur Ma liste.
- « Passer » à chaque étape mène bien à l'étape suivante ; le retour fonctionne aux étapes 2 et 3.
- Les choix sont enregistrés (vérifier en base) ; les titres ajoutés pendant l'onboarding apparaissent dans Ma liste.
