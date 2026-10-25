import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/http';
import { useProfile, useUpdateProfile, type Profile } from '@/api/profile';
import { Avatar } from '@/components/Avatar';
import { Text } from '@/components/Text';
import { UsernameField } from '@/components/UsernameField';
import { canSubmitUsername, proposeUsername } from '@/domain/social/username';
import { showToast } from '@/store/ui';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { useUsernameCheck } from '../social/useUsernameCheck';
import { OnboardingFooter } from './OnboardingFooter';
import { StepIntro } from './StepIntro';

const SAVE_FAILED = "Impossible d'enregistrer, réessaie";
/** Le défilement attend que le clavier ait réduit l'écran. */
const KEYBOARD_DELAY_MS = 300;

type Props = {
  /**
   * `onboarding` : 1re étape (barre de progression du layout), puis Langue.
   * `required` : compte existant sans pseudo, plein écran, puis retour à l'app.
   */
  variant: 'onboarding' | 'required';
};

/** « Choisis ton pseudo » (specs/social/docs/04 §4.1). */
export function UsernameScreen({ variant }: Props) {
  const insets = useSafeAreaInsets();
  const profile = useProfile().data;

  return (
    <View style={[styles.screen, variant === 'required' && { paddingTop: insets.top }]}>
      {profile ? <UsernameForm profile={profile} variant={variant} /> : null}
    </View>
  );
}

function UsernameForm({ profile, variant }: { profile: Profile } & Props) {
  const name = profile.displayName || profile.email || '';
  const [value, setValue] = useState(() => profile.username ?? proposeUsername(name));
  const [touched, setTouched] = useState(false);
  const check = useUsernameCheck(value, profile.username);
  const updateProfile = useUpdateProfile();
  const scroll = useRef<ScrollView>(null);
  const fieldY = useRef(0);
  // Clavier ouvert : le champ remonte en haut pour laisser voir l'état et les propositions.
  const revealField = () => scroll.current?.scrollTo({ y: Math.max(0, fieldY.current - 16) });

  // Proposition déjà prise : la première proposition libre la remplace, tant qu'on n'a rien tapé.
  if (!touched && check.status === 'taken' && check.suggestions[0]) {
    setTouched(true);
    setValue(check.suggestions[0]);
  }

  const change = (next: string) => {
    setTouched(true);
    setValue(next);
  };

  const next = () =>
    variant === 'onboarding'
      ? router.push('/onboarding/region')
      : router.replace('/(tabs)/watchlist');

  const submit = () => {
    // Retour sur l'étape sans rien changer : rien à enregistrer.
    if (value === profile.username) {
      next();
      return;
    }
    updateProfile.mutate(
      { username: value },
      {
        onSuccess: next,
        onError: (error) => {
          // Pris entre-temps (409) ou devenu invalide (422) : la vérification affiche pourquoi.
          if (error instanceof ApiError && (error.status === 409 || error.status === 422)) {
            check.recheck();
          } else {
            showToast(SAVE_FAILED);
          }
        },
      },
    );
  };

  return (
    <>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.identity}>
          <Avatar size={88} name={name} uri={profile.avatarUrl} mine />
          <Text numberOfLines={1} style={styles.name}>
            {name}
          </Text>
        </View>
        <StepIntro
          title="Choisis ton pseudo"
          text="C'est ton identifiant sur Zabava. Tes amis te trouveront avec. Tu ne pourras plus le changer."
          textMarginBottom={20}
        />
        <View onLayout={(event) => (fieldY.current = event.nativeEvent.layout.y)}>
          <UsernameField
            value={value}
            onChange={change}
            status={check.status}
            suggestions={check.suggestions}
            onFocus={() => setTimeout(revealField, KEYBOARD_DELAY_MS)}
          />
        </View>
      </ScrollView>
      <OnboardingFooter
        label="Continuer"
        onPress={submit}
        disabled={!canSubmitUsername(check.status) || updateProfile.isPending}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
  },
  identity: {
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 24,
  },
  name: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: colors.neutral300,
  },
});
