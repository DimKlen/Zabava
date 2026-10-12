import { Tabs } from 'expo-router/tabs';

import { TabBar } from '@/components/TabBar';
import { useUiStore } from '@/store/ui';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
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
