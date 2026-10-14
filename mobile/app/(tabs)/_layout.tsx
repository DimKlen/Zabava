import { Tabs } from 'expo-router/tabs';
import { useEffect } from 'react';

import { TabBar } from '@/components/TabBar';
import { listenToNotificationTaps, refreshPushToken } from '@/lib/notifications';
import { useUiStore } from '@/store/ui';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  // Connecté : jeton et fuseau tenus à jour, taps sur les notifications (à chaud et à froid).
  useEffect(() => {
    void refreshPushToken().catch(() => undefined);
    return listenToNotificationTaps();
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
