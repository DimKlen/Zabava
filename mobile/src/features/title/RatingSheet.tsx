import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { setMovieReview, setMovieWatched } from '@/api/libraryActions';
import { BottomSheet, SheetHandle } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { StarRating } from '@/components/StarRating';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { closeRatingSheet, useUiStore, type RatingSheetState } from '@/store/ui';
import { colors, durations } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

const COMMENT_MAX = 1000;

/** Sheet « Ta note », ouverte par « Marquer comme vu » ou par « Ma note » de la fiche. */
export function RatingSheetHost() {
  const open = useUiStore((s) => s.ratingSheetOpen);
  const sheet = useUiStore((s) => s.ratingSheet);
  if (!sheet) return null;
  // Une clé par ouverture : le formulaire repart des valeurs du film.
  return <RatingSheet key={sheet.seq} sheet={sheet} open={open} />;
}

function RatingSheet({ sheet, open }: { sheet: RatingSheetState; open: boolean }) {
  const [rating, setRating] = useState(sheet.rating);
  const [comment, setComment] = useState(sheet.comment ?? '');
  const [done, setDone] = useState(false);
  const watch = sheet.mode === 'watch';
  const keyboard = useKeyboardHeight();

  // Une seule fois par ouverture : « Enregistrer », « Passer », ou fermeture de la sheet.
  const finish = (review?: { rating?: number; comment?: string }) => {
    if (done) return;
    setDone(true);
    closeRatingSheet();
    if (watch) setMovieWatched(sheet.title, true, review);
    else if (review) setMovieReview(sheet.title, review);
  };

  return (
    <BottomSheet
      visible={open}
      // Fermer sans choisir : le film est quand même marqué vu (sans nouvelle note).
      onClose={() => finish()}
      enterDuration={durations.sheetPlatforms}
    >
      <View style={{ paddingBottom: keyboard }}>
        <SheetHandle />
        <View style={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>
            Ta note
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {sheet.title.title}
          </Text>
          <View style={styles.stars}>
            <StarRating value={rating} onChange={setRating} size={26} />
            <Text style={styles.value}>{rating ? `${rating}/10` : 'Pas de note'}</Text>
          </View>
          <TextField
            height={96}
            multiline
            textAlignVertical="top"
            maxLength={COMMENT_MAX}
            value={comment}
            onChangeText={setComment}
            placeholder="Un commentaire ? (facultatif)"
            accessibilityLabel="Commentaire"
          />
          <Text style={styles.hint}>Visible seulement par toi.</Text>
          <View style={styles.buttons}>
            <Button
              variant="secondary"
              height={44}
              label={watch ? 'Passer' : 'Annuler'}
              onPress={() => finish()}
              style={styles.button}
            />
            <Button
              variant="primary"
              height={44}
              label="Enregistrer"
              onPress={() => finish({ rating, comment })}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 18 * 1.3,
    color: colors.text,
  },
  subtitle: {
    marginTop: -8,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    color: colors.neutral400,
  },
  stars: {
    gap: 2,
  },
  value: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral300,
  },
  hint: {
    marginTop: -4,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: colors.neutral500,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  button: {
    flex: 1,
  },
});
