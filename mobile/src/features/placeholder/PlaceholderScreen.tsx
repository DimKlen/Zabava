import { Link, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  /** Nom de la route, affiché tel quel. */
  name: string;
  /** Paramètres de route éventuels, affichés sous le nom. */
  params?: Record<string, string | string[] | undefined>;
  /** Liens vers d'autres routes, pour parcourir la navigation vide. */
  links?: readonly { label: string; href: Href }[];
};

/**
 * Écran temporaire de l'étape 1 : chaque route affiche son nom.
 * Remplacé écran par écran à partir de l'étape 4.
 */
export function PlaceholderScreen({ name, params, links = [] }: Props) {
  const insets = useSafeAreaInsets();
  const paramText = params
    ? Object.entries(params)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key} = ${String(value)}`)
        .join(' · ')
    : '';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.screenX }]}
    >
      <Text style={styles.name}>{name}</Text>
      {paramText ? <Text style={styles.params}>{paramText}</Text> : null}
      {links.length > 0 ? (
        <View style={styles.links}>
          {links.map((link) => (
            <Link key={link.label} href={link.href} style={styles.link}>
              {link.label}
            </Link>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.screenX,
    paddingBottom: 24,
    gap: 8,
  },
  name: {
    ...typography.screenTitle,
    color: colors.text,
  },
  params: {
    ...typography.meta,
    color: colors.neutral400,
  },
  links: {
    marginTop: 16,
    gap: 4,
  },
  link: {
    ...typography.body,
    color: colors.accent300,
    minHeight: 44,
    textAlignVertical: 'center',
    paddingVertical: 10,
  },
});
