import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { Button } from './Button';
import { Text } from './Text';

type Props = { onRetry: () => void };

/**
 * L'erreur reste affichée tant que rien ne se passe. Pendant une nouvelle tentative
 * (« Réessayer », retour du réseau), la zone reprend son état de chargement.
 */
export function showsLoadError(query: { isError: boolean; isFetching: boolean }): boolean {
  return query.isError && !query.isFetching;
}

/** Erreur réseau dans une zone (specs/docs/10 §8). */
export function LoadError({ onRetry }: Props) {
  return (
    <View style={styles.block}>
      <Text style={styles.title}>Impossible de charger</Text>
      <Text style={styles.text}>Vérifie ta connexion et réessaie.</Text>
      <Button variant="secondary" height={44} label="Réessayer" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    padding: 24,
    gap: 8,
  },
  title: {
    fontFamily: typography.bodyStrong.fontFamily,
    fontSize: 16,
    lineHeight: 16 * 1.3,
    color: colors.text,
  },
  text: {
    ...typography.label,
    color: colors.neutral400,
  },
});
