import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { flatItems, useFeed } from '@/api/social';
import { Button } from '@/components/Button';
import { HorizontalCarousel } from '@/components/HorizontalCarousel';
import { Text } from '@/components/Text';
import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { ActivityCard } from './ActivityCard';
import { useActivitySentence } from './useActivitySentence';

/** Les 6 dernières activités, tous types confondus. */
const CARDS = 6;

/**
 * « Activité de tes amis » en haut de chaque onglet de Découvrir (specs/social/docs/04
 * §4.10). Masqué si le fil est vide, ou hors ligne sans cache.
 */
export function ActivityCarousel() {
  const feed = useFeed();
  const sentenceOf = useActivitySentence();
  const activities = flatItems(feed.data?.pages).slice(0, CARDS);
  if (activities.length === 0) return null;
  const now = new Date();
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Activité de tes amis
        </Text>
        <Button
          variant="ghost"
          height={36}
          label="Tout voir"
          onPress={() => router.push('/feed')}
          style={styles.all}
        />
      </View>
      <HorizontalCarousel
        data={activities}
        keyExtractor={(activity) => activity.id}
        renderItem={(activity) => (
          <ActivityCard activity={activity} sentence={sentenceOf(activity)} now={now} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 8,
    marginBottom: 6,
  },
  title: {
    ...typography.section,
    color: colors.text,
  },
  all: {
    paddingHorizontal: 8,
  },
});
