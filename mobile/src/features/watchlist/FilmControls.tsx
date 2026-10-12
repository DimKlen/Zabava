import { CheckIcon, CircleIcon, SortAscendingIcon } from 'phosphor-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Segmented } from '@/components/Segmented';
import {
  FILM_FILTERS,
  FILM_SORTS,
  type FilmFilter,
  type FilmSegment,
  type FilmSort,
} from '@/domain/watchlist';
import { openActionSheet } from '@/store/ui';
import { colors, spacing } from '@/theme/tokens';

const SEGMENTS = [
  { key: 'towatch', label: 'À voir' },
  { key: 'watched', label: 'Vus' },
] as const;

type Props = {
  segment: FilmSegment;
  sort: FilmSort;
  filter: FilmFilter;
  onSegmentChange: (segment: FilmSegment) => void;
  onSortChange: (sort: FilmSort) => void;
  onFilterChange: (filter: FilmFilter) => void;
};

/** Segment À voir | Vus, tri et filtres rapides (tri et filtres : À voir seulement). */
export function FilmControls({
  segment,
  sort,
  filter,
  onSegmentChange,
  onSortChange,
  onFilterChange,
}: Props) {
  const towatch = segment === 'towatch';
  const sortLabel = FILM_SORTS.find((option) => option.value === sort)?.label ?? '';

  const openSort = () =>
    openActionSheet({
      title: 'Trier par',
      options: FILM_SORTS.map((option) => ({
        label: option.label,
        icon: option.value === sort ? CheckIcon : CircleIcon,
        onPress: () => onSortChange(option.value),
      })),
    });

  return (
    <View>
      <View style={styles.bar}>
        <Segmented options={SEGMENTS} value={segment} onChange={onSegmentChange} />
        {towatch ? (
          <Button
            variant="ghost"
            height={36}
            fontSize={13}
            icon={SortAscendingIcon}
            iconSize={16}
            color={colors.neutral300}
            label={sortLabel}
            accessibilityLabel={`Trier par : ${sortLabel}`}
            onPress={openSort}
          />
        ) : null}
      </View>
      {towatch ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chips}
        >
          {FILM_FILTERS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              active={option.value === filter}
              onPress={() => onFilterChange(option.value)}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
  },
  // La grille a déjà 16 de marge : la rangée défilante déborde jusqu'aux bords.
  chipsScroll: {
    marginHorizontal: -spacing.screenX,
  },
  chips: {
    gap: 8,
    paddingTop: 12,
    paddingHorizontal: spacing.screenX,
  },
});
