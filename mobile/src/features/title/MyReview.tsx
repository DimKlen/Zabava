import { PencilSimpleIcon, StarIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ListTitle } from '@/api/libraryActions';
import { Button } from '@/components/Button';
import { StarRating } from '@/components/StarRating';
import { Text } from '@/components/Text';
import type { UserTitle } from '@/domain/types';
import { openRatingSheet } from '@/store/ui';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { InfoSection } from './InfoSection';

type Props = { movie: ListTitle; userTitle: UserTitle };

/** « Ma note » d'un film vu : visible par moi seul ; la toucher la modifie. */
export function MyReview({ movie, userTitle }: Props) {
  const { rating, comment } = userTitle;
  const edit = () => openRatingSheet({ title: movie, mode: 'edit', rating, comment });

  if (rating === undefined && comment === undefined) {
    return (
      <View style={styles.add}>
        <Button
          variant="ghost"
          height={44}
          icon={StarIcon}
          iconSize={18}
          label="Noter ce film"
          onPress={edit}
        />
      </View>
    );
  }
  return (
    <InfoSection title="Ma note">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ma note : ${rating ? `${rating} sur 10` : 'pas de note'}${comment ? `, ${comment}` : ''}. Modifier`}
        onPress={edit}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.top}>
          {rating ? (
            <>
              <StarRating value={rating} size={16} />
              <Text style={styles.value}>{rating}/10</Text>
            </>
          ) : (
            <Text style={styles.value}>Pas de note</Text>
          )}
          <View style={styles.spacer} />
          <PencilSimpleIcon size={16} color={colors.neutral400} />
        </View>
        {comment ? <Text style={styles.comment}>{comment}</Text> : null}
      </Pressable>
    </InfoSection>
  );
}

const styles = StyleSheet.create({
  add: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  card: {
    gap: 8,
    padding: 14,
    borderRadius: radii.rLg,
    backgroundColor: colors.surface,
  },
  pressed: {
    backgroundColor: colors.neutral800,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spacer: {
    flex: 1,
  },
  value: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral300,
  },
  comment: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.5,
    color: colors.text,
  },
});
