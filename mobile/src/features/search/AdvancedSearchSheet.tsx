import { XIcon } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useAdvancedCount } from '@/api/discover';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { RangeSlider } from '@/components/RangeSlider';
import { Text } from '@/components/Text';
import {
  COUNT_DEBOUNCE_MS,
  FIRST_YEAR,
  GENRES,
  addActor,
  countButtonLabel,
  defaultFilters,
  removeActor,
  setYears,
  toggleValue,
  yearsLabel,
  type AdvancedFilters,
} from '@/domain/advancedSearch';
import type { MediaType } from '@/domain/types';
import { useT, type MessageKey } from '@/i18n';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { colors, durations } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { ActorPicker } from './ActorPicker';

const TYPES: readonly { key: MediaType; label: MessageKey }[] = [
  { key: 'movie', label: 'search.type.movie' },
  { key: 'tv', label: 'search.type.tv' },
  { key: 'anime', label: 'search.type.anime' },
];

const AVAILABILITY = [
  { key: 'all', label: 'search.availability.all' },
  { key: 'mine', label: 'search.availability.mine' },
] as const;

/** Espace laissé au-dessus de la sheet. */
const TOP_GAP = 56;

type Props = {
  visible: boolean;
  filters: AdvancedFilters;
  /** Titre saisi dans le champ de recherche : il s'ajoute aux filtres. */
  title: string;
  onChange: (filters: AdvancedFilters) => void;
  onClose: () => void;
  onApply: () => void;
};

/** Recherche avancée (specs/docs/08 §8.2) : filtres et compteur en direct. */
export function AdvancedSearchSheet({
  visible,
  filters,
  title,
  onChange,
  onClose,
  onApply,
}: Props) {
  const { t } = useT();
  const { height } = useWindowDimensions();
  const currentYear = new Date().getFullYear();
  const counted = useDebouncedValue(filters, COUNT_DEBOUNCE_MS);
  const count = useAdvancedCount(counted, title, visible).data;
  const empty = count === 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      enterDuration={durations.sheetAdvancedSearch}
      panelStyle={{ height: height - TOP_GAP }}
    >
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('search.advanced.title')}
        </Text>
        <View style={styles.headerActions}>
          <Button
            variant="ghost"
            height={40}
            label={t('search.advanced.reset')}
            color={colors.neutral400}
            onPress={() => onChange(defaultFilters(new Date()))}
          />
          <Button
            variant="icon"
            height={44}
            icon={XIcon}
            iconSize={20}
            color={colors.text}
            accessibilityLabel={t('search.advanced.close')}
            onPress={onClose}
          />
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <Section label={t('search.advanced.type')}>
          <View style={styles.chips}>
            {TYPES.map((type) => (
              <Chip
                key={type.key}
                label={t(type.label)}
                height={34}
                paddingHorizontal={14}
                active={filters.types.includes(type.key)}
                onPress={() =>
                  onChange({ ...filters, types: toggleValue(filters.types, type.key) })
                }
              />
            ))}
          </View>
        </Section>

        <Section label={t('search.advanced.actors')}>
          <ActorPicker
            actors={filters.actors}
            onAdd={(actor) => onChange(addActor(filters, actor))}
            onRemove={(id) => onChange(removeActor(filters, id))}
          />
        </Section>

        <Section label={t('search.advanced.genres')}>
          <View style={styles.chips}>
            {GENRES.map((genre) => (
              <Chip
                key={genre.key}
                label={genre.label}
                active={filters.genres.includes(genre.key)}
                onPress={() =>
                  onChange({ ...filters, genres: toggleValue(filters.genres, genre.key) })
                }
              />
            ))}
          </View>
        </Section>

        <Section label={t('search.advanced.years')} value={yearsLabel(filters)}>
          <RangeSlider
            accessibilityLabel={t('search.advanced.years')}
            min={FIRST_YEAR}
            max={currentYear}
            value={[filters.yearFrom, filters.yearTo]}
            onChange={(years) => onChange(setYears(filters, years))}
          />
        </Section>

        <Section label={t('search.advanced.availability')}>
          <View style={styles.chips}>
            {AVAILABILITY.map((option) => (
              <Chip
                key={option.key}
                label={t(option.label)}
                active={filters.availability === option.key}
                onPress={() => onChange({ ...filters, availability: option.key })}
              />
            ))}
          </View>
        </Section>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          variant="primary"
          height={50}
          fontSize={15}
          label={count === undefined ? t('search.advanced.apply') : countButtonLabel(count)}
          disabled={count === undefined || empty}
          onPress={onApply}
          testID="advanced-apply"
        />
      </View>
    </BottomSheet>
  );
}

function Section({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <View>
      {value === undefined ? (
        <Text style={[typography.overline, styles.label]}>{label}</Text>
      ) : (
        <View style={styles.labelRow}>
          <Text style={typography.overline}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingRight: 8,
    paddingBottom: 6,
    paddingLeft: 16,
  },
  title: {
    ...typography.section,
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    gap: 20,
    paddingTop: 6,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  value: {
    ...typography.meta,
    color: colors.neutral300,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footer: {
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
});
