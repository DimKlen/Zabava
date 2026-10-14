import { useState } from 'react';
import {
  StyleSheet,
  View,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

const COLLAPSED_LINES = 2;

/** Biographie sur 2 lignes, avec « Voir plus » / « Voir moins » si elle dépasse. */
export function PersonBio({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [lineCount, setLineCount] = useState(0);

  // Copie invisible sans limite de lignes : seule mesure fiable sur iOS et Android.
  const measure = (event: NativeSyntheticEvent<TextLayoutEventData>) =>
    setLineCount(event.nativeEvent.lines.length);

  return (
    <View style={styles.block}>
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
          label={expanded ? 'Voir moins' : 'Voir plus'}
          onPress={() => setExpanded((value) => !value)}
          style={styles.more}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: 16,
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.55,
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
    marginLeft: -4,
  },
});
