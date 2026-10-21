import { Tabs } from 'expo-router/tabs';
import { useEffect } from 'react';

import { TabBar } from '@/components/TabBar';
import { prefetchDiscover } from '@/features/discover/prefetchDiscover';
import { notificationsWanted } from '@/api/profile';
import {
  listenToNotificationTaps,
  refreshPushToken,
  showNotificationsInForeground,
} from '@/lib/notifications';
import { useUiStore } from '@/store/ui';
import { colors } from '@/theme/tokens';

/** Laisse Ma liste se charger d'abord. */
const DISCOVER_PREFETCH_DELAY_MS = 1500;

export default function TabsLayout() {
  // Connecté : jeton et fuseau tenus à jour (permission demandée si elle ne l'a jamais été),
  // notifications affichées l'app ouverte, taps sur les notifications (à chaud et à froid).
  useEffect(() => {
    void showNotificationsInForeground().catch(() => undefined);
    void refreshPushToken(notificationsWanted).catch(() => undefined);
    return listenToNotificationTaps();
  }, []);

  // Découvrir préparé en arrière-plan, après le premier affichage de Ma liste.
  useEffect(() => {
    const timer = setTimeout(() => void prefetchDiscover(), DISCOVER_PREFETCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      screenListeners={{
        // Changer d'onglet referme la carte swipée.
        tabPress: () => useUiStore.getState().setSwipedCard(null),
      }}
    >
      <Tabs.Screen name="watchlist" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="upcoming" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
