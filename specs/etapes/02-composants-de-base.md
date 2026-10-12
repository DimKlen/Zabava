# Étape 2 — Bibliothèque de composants

**Objectif** : tous les composants de `docs/03-composants.md`, conformes au pixel, visibles dans un écran de démonstration `app/dev/kitchen-sink.tsx` (seulement en développement).

## À créer dans `src/components/`
Button (primary, secondary, ghost, icon) · Chip · UnderlineTabs · Segmented · Switch · Poster (avec dégradé de remplacement, badge, +, appui long) · CheckButton · NextEpisodeCard (swipe compris) · RatingChips · ProviderLogo · SectionHeader · ScreenHeader · TabBar · RoundIconButton · BottomSheet + ActionSheet · Dialog · Toast (+ hôte et store) · Skeleton (shimmer) · EmptyState · OfflineBanner · PosterGrid · HorizontalCarousel · SelectField (`.field` + `.input` qui ouvre une ActionSheet).

## Détails
- Animations de `docs/02` §7 avec Reanimated ; haptique via `src/lib/haptics.ts`.
- Hôtes globaux (Toast, ActionSheet, Dialog) montés une seule fois dans `app/_layout.tsx`, pilotés par `src/store/ui.ts` (`showToast`, `openActionSheet`, `openDialog`).
- Ordre d'empilement : écran < Toast < ActionSheet / sheets < Dialog.
- Tests (@testing-library) : Poster (tap / tap sur le + / appui long), CheckButton, Switch, Toast (5 s, Annuler).

## Critères d'acceptation
- Le kitchen-sink, à côté du prototype (`reference/App Suivi.dc.html`), montre les mêmes tailles, couleurs, rayons et textes. Comparer à 390 pt de large.
- Le swipe de la carte respecte les seuils (−60 / −150 / −170) et ne gêne pas le défilement vertical.
- Les zones tactiles font toutes au moins 44 pt (vérifier avec l'inspecteur).
