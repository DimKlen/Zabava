/**
 * État d'interface global (non persisté) — specs/docs/10 §6.
 * Les hôtes Toast, ActionSheet et Dialog de app/_layout.tsx lisent ce store.
 */
import type { Icon } from 'phosphor-react-native';
import { create } from 'zustand';

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

type UiState = {
  toast: ToastState | null;
  /** Contenu conservé après fermeture, pour l'animation de sortie. */
  actionSheet: ActionSheetState | null;
  actionSheetOpen: boolean;
  dialog: DialogState | null;
  dialogOpen: boolean;
  /** Carte « prochain épisode » ouverte par un swipe (une seule à la fois). */
  swipedCardId: string | null;

  showToast: (message: string, undo?: () => void) => void;
  hideToast: () => void;
  undoToast: () => void;
  openActionSheet: (sheet: ActionSheetState) => void;
  closeActionSheet: () => void;
  openDialog: (dialog: DialogState) => void;
  closeDialog: () => void;
  setSwipedCard: (id: string | null) => void;
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
  swipedCardId: null,

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
}));

// Raccourcis utilisables hors des composants (mutations, handlers).
export const showToast = (message: string, undo?: () => void) =>
  useUiStore.getState().showToast(message, undo);
export const openActionSheet = (sheet: ActionSheetState) =>
  useUiStore.getState().openActionSheet(sheet);
export const openDialog = (dialog: DialogState) => useUiStore.getState().openDialog(dialog);
