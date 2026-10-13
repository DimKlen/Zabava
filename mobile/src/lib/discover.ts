import { onlineManager } from '@tanstack/react-query';
import { router } from 'expo-router';

import type { MediaType } from '@/domain/types';
import { showToast, useUiStore } from '@/store/ui';

/** Onglet Découvrir sur le bon type (états vides de Ma liste et d'À venir). */
export function openDiscover(type: MediaType): void {
  useUiStore.getState().setDiscoverTab(type);
  router.navigate('/(tabs)/discover');
}

/** Loupe de Ma liste et de Découvrir : indisponible hors ligne. */
export function openSearch(): void {
  if (!onlineManager.isOnline()) {
    showToast('Recherche indisponible hors ligne');
    return;
  }
  router.push('/search');
}
