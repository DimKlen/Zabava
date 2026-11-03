import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Poster } from '@/components/Poster';
import { Text } from '@/components/Text';
import type { ProfileGridItem } from '@/domain/social/profileLists';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { openTitle, pressTitle, previewOf } from '../title/openTitle';

const CODE_SIZE = 12;
/** Sous une affiche En cours : gap 6 + barre 3 + gap 4 + code (12 × 1,3). */
export const PROGRESS_HEIGHT = 6 + 3 + 4 + CODE_SIZE * 1.3;

type Props = { item: ProfileGridItem; width: number };

/**
 * Affiche d'un profil (specs/social/docs/03 › ProfileLists) : sans badge de plateforme, en lecture
 * seule (ni « + » ni coche : on ne modifie pas la liste d'un autre) ; la fiche, elle, agit sur
 * **ma** liste. Barre de progression et dernier épisode sous En cours.
 */
export const ProfilePoster = memo(function ProfilePoster({ item, width }: Props) {
  return (
    <View style={[styles.cell, { width }]}>
      <Poster
        title={item}
        onPress={() => openTitle(previewOf(item, 'w342'))}
        onPressIn={() => pressTitle(previewOf(item, 'w342'))}
        style={{ width }}
      />
      {item.progress ? (
        <View style={styles.progress}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${item.progress.pct}%` }]} />
          </View>
          <Text style={styles.code}>{item.progress.code}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  cell: {
    gap: 6,
  },
  progress: {
    gap: 4,
  },
  track: {
    height: 3,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.neutral800,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  code: {
    fontFamily: fonts.regular,
    fontSize: CODE_SIZE,
    lineHeight: CODE_SIZE * 1.3,
    color: colors.neutral400,
  },
});
