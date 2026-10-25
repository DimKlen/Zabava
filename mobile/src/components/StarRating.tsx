import { StarIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityActionEvent } from 'react-native';

import { colors } from '@/theme/tokens';

export const MAX_RATING = 10;
const STARS = Array.from({ length: MAX_RATING }, (_, index) => index + 1);

type Props = {
  value: number | undefined;
  /** Absent : affichage seul (fiche › « Ma note »). */
  onChange?: (value: number | undefined) => void;
  size: number;
};

/**
 * Note de 1 à 10 en étoiles. Les 10 étoiles ne tiennent pas en zones de 44 pt : toute la rangée
 * (48 de haut) est une seule zone tactile, la note suit la position du doigt ; retoucher la note
 * en cours l'efface. Lecteur d'écran : réglable par « augmenter » / « diminuer ».
 */
export function StarRating({ value, onChange, size }: Props) {
  const [width, setWidth] = useState(0);
  // Les étoiles ne reçoivent pas le toucher : `locationX` est alors mesuré dans la rangée.
  const stars = (
    <View pointerEvents="none" style={styles.row}>
      {STARS.map((star) => (
        <StarIcon
          key={star}
          size={size}
          weight={value !== undefined && star <= value ? 'fill' : 'regular'}
          color={value !== undefined && star <= value ? colors.accent : colors.neutral600}
        />
      ))}
    </View>
  );
  if (!onChange) {
    return (
      <View accessible accessibilityLabel={value ? `${value} sur 10` : 'Pas de note'}>
        {stars}
      </View>
    );
  }

  const pick = (x: number) => {
    if (width <= 0) return;
    const star = Math.min(MAX_RATING, Math.max(1, Math.ceil((x / width) * MAX_RATING)));
    onChange(star === value ? undefined : star);
  };
  const adjust = ({ nativeEvent }: AccessibilityActionEvent) => {
    const current = value ?? 0;
    if (nativeEvent.actionName === 'increment') onChange(Math.min(MAX_RATING, current + 1));
    if (nativeEvent.actionName === 'decrement') onChange(current > 1 ? current - 1 : undefined);
  };

  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel="Note"
      accessibilityValue={
        value
          ? { min: 1, max: MAX_RATING, now: value, text: `${value} sur 10` }
          : { text: 'Pas de note' }
      }
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={adjust}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onPress={(event) => pick(event.nativeEvent.locationX)}
      style={styles.touch}
    >
      {stars}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: {
    minHeight: 48,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
