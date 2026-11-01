import { useState } from 'react';
import {
  StyleSheet,
  View,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useT } from '@/i18n';
import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { InfoSection } from './InfoSection';

const COLLAPSED_LINES = 3;

/** Synopsis sur 3 lignes, avec « Voir plus » / « Voir moins » s'il dépasse. */
export function Synopsis({ text }: { text: string }) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  const [lineCount, setLineCount] = useState(0);

  // Copie invisible sans limite de lignes : seule mesure fiable sur iOS et Android.
  const measure = (event: NativeSyntheticEvent<TextLayoutEventData>) =>
    setLineCount(event.nativeEvent.lines.length);

  return (
    <InfoSection title={t('title.synopsis')} titleGap={8}>
      <View>
        <Text
          onTextLayout={measure}
          style={[styles.text, styles.measure]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {text}
        </Text>
        <Text numberOfLines={expanded ? undefined : COLLAPSED_LINES} style={styles.text}>
          {text}
        </Text>
      </View>
      {lineCount > COLLAPSED_LINES ? (
        <Button
          variant="ghost"
          height={32}
          label={expanded ? t('title.synopsis.less') : t('title.synopsis.more')}
          onPress={() => setExpanded((value) => !value)}
          style={styles.more}
        />
      ) : null}
    </InfoSection>
  );
}

const styles = StyleSheet.create({
  text: {
    ...typography.body,
    color: colors.neutral300,
  },
  measure: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0,
  },
  more: {
    alignSelf: 'flex-start',
    marginTop: 2,
    marginLeft: -4,
  },
});
