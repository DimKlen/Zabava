import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { toggleInList } from '@/api/libraryActions';
import { Poster } from '@/components/Poster';
import { Text } from '@/components/Text';
import type { ProfileGridItem } from '@/domain/social/profileLists';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { toListTitle } from '../catalog/CatalogPoster';
import { openTitle, pressTitle, previewOf } from '../title/openTitle';

const CODE_SIZE = 12;
/** Sous une affiche En cours : gap 6 + barre 3 + gap 4 + code (12 × 1,3). */
export const PROGRESS_HEIGHT = 6 + 3 + 4 + CODE_SIZE * 1.3;

type Props = { item: ProfileGridItem; inList: boolean; width: number };

/**
 * Affiche d'un profil (specs/social/docs/03 › ProfileLists) : sans badge de plateforme ; le « + »
 * et la coche concernent **ma** liste ; barre de progression et dernier épisode sous En cours.
 */
export const ProfilePoster = memo(function ProfilePoster({ item, inList, width }: Props) {
  return (
    <View style={[styles.cell, { width }]}>
      <Poster
        title={item}
        showAdd
        inList={inList}
        onPress={() => openTitle(previewOf(item, 'w342'))}
        onPressIn={() => pressTitle(previewOf(item, 'w342'))}
        onToggle={() => toggleInList(toListTitle(item))}
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
