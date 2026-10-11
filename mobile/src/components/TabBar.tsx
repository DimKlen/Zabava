import type { BottomTabBarProps } from 'expo-router/tabs';
import type { Icon } from 'phosphor-react-native';
import {
  BookmarkSimpleIcon,
  CalendarBlankIcon,
  CompassIcon,
  UserCircleIcon,
} from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

/** Ordre, libellés et icônes — specs/docs/03 › TabBar. */
export const TAB_ITEMS: Record<string, { label: string; icon: Icon }> = {
  watchlist: { label: 'Ma liste', icon: BookmarkSimpleIcon },
  discover: { label: 'Découvrir', icon: CompassIcon },
  upcoming: { label: 'À venir', icon: CalendarBlankIcon },
  profile: { label: 'Profil', icon: UserCircleIcon },
};

/** Zone sûre basse minimale incluse dans les 84 pt de la barre. */
const MIN_BOTTOM = 26;
const CONTENT_HEIGHT = 84 - MIN_BOTTOM;

/**
 * Barre d'onglets maison. Re-taper l'onglet actif émet `tabPress` sans
 * changer d'onglet : les listes l'écoutent (useScrollToTop) pour remonter.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, MIN_BOTTOM);

  return (
    <View style={[styles.bar, { height: CONTENT_HEIGHT + bottom, paddingBottom: bottom }]}>
      {state.routes.map((route, index) => {
        const item = TAB_ITEMS[route.name];
        if (!item) return null;
        const focused = state.index === index;
        const color = focused ? colors.accent : colors.neutral500;
        const IconComponent = item.icon;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={item.label}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.item}
          >
            <IconComponent size={24} color={color} weight={focused ? 'fill' : 'regular'} />
            <Text style={[styles.label, { color }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingHorizontal: 8,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral900,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 11 * 1.3,
  },
});
