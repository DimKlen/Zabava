import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import type { InfoRow } from '@/domain/movieDetail';
import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { openPerson, pressPerson } from '../person/openPerson';
import { openStudio } from '../studio/openStudio';

type SectionProps = {
  title: string;
  /** 10 par défaut ; 8 pour Synopsis, Équipe et Infos. */
  titleGap?: 8 | 10;
  /** 24 par défaut ; 16 pour Infos. */
  paddingTop?: 16 | 24;
  /** Carrousels : le titre garde ses 16 de marge, le contenu va jusqu'aux bords. */
  fullWidth?: boolean;
  children: ReactNode;
};

/** Section de la partie « Infos » d'une fiche : titre 18/500 puis contenu. */
export function InfoSection({
  title,
  titleGap = 10,
  paddingTop = 24,
  fullWidth = false,
  children,
}: SectionProps) {
  return (
    <View style={[{ paddingTop }, !fullWidth && styles.padded]}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { marginBottom: titleGap }, fullWidth && styles.padded]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Lignes clé / valeur (Équipe, Infos) : clé de 120 en neutral500. */
export function InfoRows({ rows }: { rows: InfoRow[] }) {
  return (
    <>
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <Text style={styles.key}>{row.key}</Text>
          {row.studios ? (
            // Sur une ligne, séparés par des virgules ; chaque studio ouvre sa page.
            <View style={styles.inline}>
              {row.studios.map((studio, index) => (
                <View key={studio.id} style={styles.inlineItem}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={studio.name}
                    onPress={() => openStudio(studio)}
                    style={styles.person}
                  >
                    <Text style={styles.link}>{studio.name}</Text>
                  </Pressable>
                  {index < (row.studios?.length ?? 0) - 1 ? (
                    <Text style={styles.value}>, </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : row.people ? (
            <View style={styles.people}>
              {row.people.map((person) => (
                <Pressable
                  key={person.id}
                  accessibilityRole="button"
                  accessibilityLabel={person.name}
                  onPress={() => openPerson(person)}
                  onPressIn={() => pressPerson(person)}
                  style={styles.person}
                >
                  <Text style={styles.link}>{person.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.value}>{row.value}</Text>
          )}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  padded: {
    paddingHorizontal: 16,
  },
  title: {
    ...typography.section,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
  },
  key: {
    ...typography.label,
    width: 120,
    color: colors.neutral500,
  },
  value: {
    ...typography.label,
    flex: 1,
    color: colors.text,
  },
  people: {
    flex: 1,
  },
  inline: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  inlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  person: {
    minHeight: 44,
    justifyContent: 'center',
    marginVertical: -6,
  },
  link: {
    ...typography.label,
    color: colors.accent,
  },
});
