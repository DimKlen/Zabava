import { CheckCircleIcon, XCircleIcon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cleanUsername, type UsernameStatus } from '@/domain/social/username';
import { useT, type MessageKey } from '@/i18n';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { Chip } from './Chip';
import { MAX_FONT_SCALE, Text } from './Text';

type Props = {
  value: string;
  /** Reçoit la saisie déjà nettoyée (minuscules, sans accents, 20 caractères). */
  onChange: (value: string) => void;
  status: UsernameStatus;
  suggestions: string[];
  /** Lecture seule (changement de pseudo trop récent). */
  editable?: boolean;
  onFocus?: () => void;
};

/** Un tour du petit indicateur de vérification. */
const SPIN_MS = 700;

const MESSAGES: Partial<Record<UsernameStatus, { key: MessageKey; color: string }>> = {
  checking: { key: 'common.username.checking', color: colors.neutral500 },
  available: { key: 'common.username.available', color: colors.accent300 },
  invalid: { key: 'common.username.invalid', color: colors.neutral400 },
  offline: { key: 'common.username.offline', color: colors.neutral300 },
};

/** Champ pseudo (specs/social/docs/03 › UsernameField) : « @ », vérification en direct, propositions. */
export function UsernameField({
  value,
  onChange,
  status,
  suggestions,
  editable = true,
  onFocus,
}: Props) {
  const { t } = useT();
  const border =
    status === 'available'
      ? colors.accent
      : status === 'taken'
        ? colors.neutral400
        : colors.divider;
  const message = MESSAGES[status];

  return (
    <View style={styles.column}>
      <View style={[styles.field, { borderColor: border }]}>
        <Text style={styles.prefix}>@</Text>
        <TextInput
          value={value}
          onChangeText={(text) => onChange(cleanUsername(text))}
          editable={editable}
          onFocus={onFocus}
          accessibilityLabel={t('common.username.label')}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="no"
          spellCheck={false}
          keyboardType="visible-password"
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          selectionColor={colors.accentA35}
          cursorColor={colors.accent}
          style={[styles.input, !editable && styles.readOnly]}
        />
        {status === 'checking' ? <Spinner /> : null}
        {status === 'available' ? (
          <CheckCircleIcon size={20} weight="fill" color={colors.accent} />
        ) : null}
      </View>
      {message ? (
        <Text accessibilityLiveRegion="polite" style={[styles.message, { color: message.color }]}>
          {t(message.key)}
        </Text>
      ) : null}
      {status === 'taken' ? (
        <>
          <View accessibilityLiveRegion="polite" style={styles.takenRow}>
            <XCircleIcon size={16} color={colors.neutral100} />
            <Text style={[styles.message, styles.taken]}>{t('common.username.taken')}</Text>
          </View>
          <View style={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <Chip
                key={suggestion}
                label={`@${suggestion}`}
                active={false}
                onPress={() => onChange(suggestion)}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

/** Anneau de 16 qui tourne (bord neutral700, haut accent). */
function Spinner() {
  const { t } = useT();
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.set(withRepeat(withTiming(1, { duration: SPIN_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(turn);
  }, [turn]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 360}deg` }] }));

  return (
    <Animated.View
      accessibilityLabel={t('common.username.checkingA11y')}
      style={[styles.spinner, style]}
    />
  );
}

const styles = StyleSheet.create({
  column: {
    gap: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: radii.rMd,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  prefix: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 16 * 1.3,
    color: colors.neutral500,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
  },
  readOnly: {
    color: colors.neutral400,
  },
  spinner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.neutral700,
    borderTopColor: colors.accent,
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
  },
  takenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taken: {
    color: colors.neutral100,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
