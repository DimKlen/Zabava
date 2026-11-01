import type { BottomTabBarProps } from 'expo-router/tabs';
import type { Icon } from 'phosphor-react-native';
import {
  BookmarkSimpleIcon,
  CalendarBlankIcon,
  CompassIcon,
  UserCircleIcon,
} from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT, type MessageKey } from '@/i18n';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { Text } from './Text';

/** Ordre, libellés et icônes — specs/docs/03 › TabBar. */
export const TAB_ITEMS: Record<string, { labelKey: MessageKey; icon: Icon }> = {
  watchlist: { labelKey: 'tabs.list', icon: BookmarkSimpleIcon },
  discover: { labelKey: 'tabs.discover', icon: CompassIcon },
  upcoming: { labelKey: 'tabs.upcoming', icon: CalendarBlankIcon },
  profile: { labelKey: 'tabs.profile', icon: UserCircleIcon },
};

/** Zone sûre basse minimale incluse dans les 84 pt de la barre. */
const MIN_BOTTOM = 26;
const CONTENT_HEIGHT = 84 - MIN_BOTTOM;

/**
 * Barre d'onglets maison. Re-taper l'onglet actif émet `tabPress` sans
 * changer d'onglet : les listes l'écoutent (useScrollToTop) pour remonter.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useT();
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
            accessibilityLabel={t(item.labelKey)}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.item}
          >
            <IconComponent size={24} color={color} weight={focused ? 'fill' : 'regular'} />
            <Text style={[styles.label, { color }]}>{t(item.labelKey)}</Text>
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
