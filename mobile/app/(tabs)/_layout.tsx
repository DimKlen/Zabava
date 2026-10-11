import { Tabs } from 'expo-router';
import type { Icon } from 'phosphor-react-native';
import { BookmarkSimple, CalendarBlank, Compass, UserCircle } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

// Barre provisoire aux couleurs Nocturne ; la TabBar maison de
// specs/docs/03-composants.md arrive à l'étape 2.
function tabIcon(IconComponent: Icon) {
  return function TabIcon({ focused }: { focused: boolean }) {
    return (
      <IconComponent
        size={24}
        color={focused ? colors.accent : colors.neutral500}
        weight={focused ? 'fill' : 'regular'}
      />
    );
  };
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 26);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.neutral500,
        tabBarLabelStyle: { fontFamily: fonts.regular, fontSize: 11 },
        tabBarStyle: {
          height: 58 + bottom,
          paddingTop: 6,
          paddingBottom: bottom,
          paddingHorizontal: 8,
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.neutral900,
        },
      }}
    >
      <Tabs.Screen
        name="watchlist"
        options={{ title: 'Ma liste', tabBarIcon: tabIcon(BookmarkSimple) }}
      />
      <Tabs.Screen name="discover" options={{ title: 'Découvrir', tabBarIcon: tabIcon(Compass) }} />
      <Tabs.Screen
        name="upcoming"
        options={{ title: 'À venir', tabBarIcon: tabIcon(CalendarBlank) }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon(UserCircle) }} />
    </Tabs>
  );
}
