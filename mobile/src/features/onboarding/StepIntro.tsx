import { StyleSheet } from 'react-native';

import { Text } from '@/components/Text';
import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  title: string;
  text: string;
  /** Marge sous le texte : 24 (langue, plateformes), 20 (pseudo) ou 8 (titres). */
  textMarginBottom: 8 | 20 | 24;
};

/** Titre 28/500 et texte 15 neutral400 d'une étape. */
export function StepIntro({ title, text, textMarginBottom }: Props) {
  return (
    <>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={[styles.text, { marginBottom: textMarginBottom }]}>{text}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.screenTitle,
    marginBottom: 8,
    color: colors.text,
  },
  text: {
    ...typography.body,
    color: colors.neutral400,
  },
});
