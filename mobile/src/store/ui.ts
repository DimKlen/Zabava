/**
 * État d'interface global (non persisté) — specs/docs/10 §6.
 * Les hôtes Toast, ActionSheet et Dialog de app/_layout.tsx lisent ce store.
 */
import type { Icon } from 'phosphor-react-native';
import { create } from 'zustand';

import type { ListTitle } from '@/api/libraryActions';

import type { SeriesSection } from '@/domain/series';
import { DEFAULT_COLLAPSED } from '@/domain/seriesList';
import type { MediaType } from '@/domain/types';
import type { FilmFilter, FilmSegment, FilmSort } from '@/domain/watchlist';
import { durations } from '@/theme/tokens';

export type ToastState = {
  /** Change à chaque toast : relance l'animation d'entrée. */
  id: number;
  message: string;
  undo?: () => void;
};

export type ActionSheetOption = {
  label: string;
  icon?: Icon;
  onPress: () => void;
};

export type ActionSheetState = {
  title?: string;
  options: ActionSheetOption[];
};

export type DialogAction = {
  label: string;
  variant: 'primary' | 'secondary';
  onPress?: () => void;
};

export type DialogState = {
  title: string;
  body?: string;
  actions: DialogAction[];
};

/**
 * Sheet « Ta note » d'un film : `watch` le marque vu en l'ouvrant (« Passer » sans note), `edit`
 * change la note d'un film déjà vu. Note et commentaire d'avant pour pré-remplir.
 */
export type RatingSheetState = {
  title: ListTitle;
  mode: 'watch' | 'edit';
  rating?: number;
  comment?: string;
};

type UiState = {
  toast: ToastState | null;
  /** Contenu conservé après fermeture, pour l'animation de sortie. */
  actionSheet: ActionSheetState | null;
  actionSheetOpen: boolean;
  dialog: DialogState | null;
  dialogOpen: boolean;
  /** Contenu conservé après fermeture, pour l'animation de sortie ; `seq` change à chaque ouverture. */
  ratingSheet: (RatingSheetState & { seq: number }) | null;
  ratingSheetOpen: boolean;
  /** Carte « prochain épisode » ouverte par un swipe (une seule à la fois). */
  swipedCardId: string | null;
  /** Ma liste : onglet, segment, filtre et tri des films, gardés pendant la session. */
  watchlistTab: MediaType;
  filmSegment: FilmSegment;
  filmFilter: FilmFilter;
  filmSort: FilmSort;
  /** Sens inverse du tri (par défaut : récents, plus proches, A → Z, mieux notés). */
  filmSortReversed: boolean;
  /** Cloche d'un titre hors liste : préférence locale (true = alertes coupées). */
  alertsOff: Record<string, boolean>;
  /** Sections repliées de Séries / Animés, gardées pendant la session. */
  collapsedSections: Partial<Record<SeriesSection, boolean>>;
  /** Onglet de Découvrir, gardé pendant la session. */
  discoverTab: MediaType;
  /** À venir : filtre (Tout, Films, Séries, Animés). */
  upcomingFilter: 'all' | MediaType;
  /** Sheet « Inviter » (onglet Profil, amis vides, recherche de membres). */
  inviteOpen: boolean;

  showToast: (message: string, undo?: () => void) => void;
  hideToast: () => void;
  undoToast: () => void;
  openActionSheet: (sheet: ActionSheetState) => void;
  closeActionSheet: () => void;
  openDialog: (dialog: DialogState) => void;
  closeDialog: () => void;
  setSwipedCard: (id: string | null) => void;
  setWatchlistTab: (tab: MediaType) => void;
  setFilmSegment: (segment: FilmSegment) => void;
  setFilmFilter: (filter: FilmFilter) => void;
  /** Même tri : inverse le sens ; autre tri : repart du sens par défaut. */
  setFilmSort: (sort: FilmSort) => void;
  /** Filtre par nom de Ma liste (loupe de l'en-tête) ; null = champ fermé. */
  watchlistQuery: string | null;
  setWatchlistQuery: (query: string | null) => void;
  /** Inverse le sens du tri courant (« Plus récents » ↔ « Plus anciens »). */
  toggleFilmSortDirection: () => void;
  setAlertsOff: (titleId: string, off: boolean) => void;
  toggleSection: (section: SeriesSection) => void;
  setDiscoverTab: (tab: MediaType) => void;
  setUpcomingFilter: (filter: 'all' | MediaType) => void;
};

let toastTimer: ReturnType<typeof setTimeout> | undefined;
let toastSeq = 0;

function clearToastTimer() {
  if (toastTimer !== undefined) clearTimeout(toastTimer);
  toastTimer = undefined;
}

export const useUiStore = create<UiState>()((set, get) => ({
  toast: null,
  actionSheet: null,
  actionSheetOpen: false,
  dialog: null,
  dialogOpen: false,
  ratingSheet: null,
  ratingSheetOpen: false,
  swipedCardId: null,
  watchlistTab: 'movie',
  filmSegment: 'towatch',
  filmFilter: 'all',
  filmSort: 'added',
  filmSortReversed: false,
  watchlistQuery: null,
  alertsOff: {},
  collapsedSections: { ...DEFAULT_COLLAPSED },
  discoverTab: 'movie',
  upcomingFilter: 'all',
  inviteOpen: false,

  // Un nouveau toast remplace le précédent et relance le minuteur de 5 s.
  showToast: (message, undo) => {
    clearToastTimer();
    toastSeq += 1;
    set({ toast: { id: toastSeq, message, undo } });
    toastTimer = setTimeout(() => {
      toastTimer = undefined;
      set({ toast: null });
    }, durations.toast);
  },
  hideToast: () => {
    clearToastTimer();
    set({ toast: null });
  },
  // « Annuler » restaure l'état d'avant l'action, puis masque le toast.
  undoToast: () => {
    const undo = get().toast?.undo;
    get().hideToast();
    undo?.();
  },

  openActionSheet: (actionSheet) => set({ actionSheet, actionSheetOpen: true }),
  closeActionSheet: () => set({ actionSheetOpen: false }),

  openDialog: (dialog) => set({ dialog, dialogOpen: true }),
  closeDialog: () => set({ dialogOpen: false }),

  setSwipedCard: (swipedCardId) => set({ swipedCardId }),
  // Changer d'onglet referme la carte swipée.
  setWatchlistTab: (watchlistTab) => set({ watchlistTab, swipedCardId: null }),
  setFilmSegment: (filmSegment) => set({ filmSegment }),
  setFilmFilter: (filmFilter) => set({ filmFilter }),
  setFilmSort: (filmSort) =>
    set((s) => ({
      filmSort,
      filmSortReversed: s.filmSort === filmSort ? !s.filmSortReversed : false,
    })),
  setWatchlistQuery: (watchlistQuery) => set({ watchlistQuery }),
  toggleFilmSortDirection: () => set((s) => ({ filmSortReversed: !s.filmSortReversed })),
  setAlertsOff: (titleId, off) => set((s) => ({ alertsOff: { ...s.alertsOff, [titleId]: off } })),
  toggleSection: (section) =>
    set((s) => ({
      collapsedSections: { ...s.collapsedSections, [section]: !s.collapsedSections[section] },
    })),
  setDiscoverTab: (discoverTab) => set({ discoverTab }),
  setUpcomingFilter: (upcomingFilter) => set({ upcomingFilter }),
}));

// Raccourcis utilisables hors des composants (mutations, handlers).
export const showToast = (message: string, undo?: () => void) =>
  useUiStore.getState().showToast(message, undo);
export const openActionSheet = (sheet: ActionSheetState) =>
  useUiStore.getState().openActionSheet(sheet);
export const openDialog = (dialog: DialogState) => useUiStore.getState().openDialog(dialog);

let ratingSeq = 0;
export const openRatingSheet = (sheet: RatingSheetState) => {
  ratingSeq += 1;
  useUiStore.setState({ ratingSheet: { ...sheet, seq: ratingSeq }, ratingSheetOpen: true });
};
export const closeRatingSheet = () => useUiStore.setState({ ratingSheetOpen: false });

export const openInviteSheet = () => useUiStore.setState({ inviteOpen: true });
export const closeInviteSheet = () => useUiStore.setState({ inviteOpen: false });
