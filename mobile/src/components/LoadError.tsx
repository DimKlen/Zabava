import { StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
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
  const { t } = useT();
  return (
    <View style={styles.block}>
      <Text style={styles.title}>{t('common.loadError.title')}</Text>
      <Text style={styles.text}>{t('common.loadError.text')}</Text>
      <Button
        variant="secondary"
        height={44}
        label={t('common.loadError.retry')}
        onPress={onRetry}
      />
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
