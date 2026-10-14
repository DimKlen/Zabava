import { router } from 'expo-router';
import { AppleLogoIcon, GoogleLogoIcon, PopcornIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { signInWithApple, signInWithGoogle, type SignInResult } from '@/api/auth';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { openWebPage, PRIVACY_URL, TERMS_URL } from '@/lib/links';
import { colors, radii } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

import { LoginMosaic } from './LoginMosaic';

type LoginState = 'idle' | 'busy' | 'cancelled' | 'error';

const STATUS_TEXT: Record<Exclude<LoginState, 'idle'>, string> = {
  busy: 'Connexion en cours…',
  cancelled: 'Connexion annulée',
  error: 'Impossible de se connecter, réessaie',
};

/** Connexion Apple / Google (specs/docs/05 §5.1). */
export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<LoginState>('idle');
  const busy = state === 'busy';

  const run = async (signIn: () => Promise<SignInResult>) => {
    setState('busy');
    const result = await signIn();
    if (result !== 'success') {
      setState(result);
      return;
    }
    setState('idle');
    // La garde d'auth choisit entre l'onboarding et Ma liste. dismissAll retire
    // l'écran du lien de retour OAuth qu'Android a pu empiler.
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };

  return (
    <View style={styles.screen}>
      <LoginMosaic />
      <View style={[styles.content, { bottom: 44 + insets.bottom }]}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <PopcornIcon size={24} color={colors.accent} />
          </View>
          <Text style={styles.brandName}>Zabava</Text>
        </View>
        <Text style={styles.title}>Tout ce que tu regardes, au même endroit</Text>
        <Text style={styles.text}>
          Films, séries et animés : ta liste, tes épisodes et les sorties à venir.
        </Text>
        <Button
          variant="primary"
          height={50}
          fontSize={15}
          icon={AppleLogoIcon}
          iconWeight="fill"
          iconSize={20}
          label="Continuer avec Apple"
          disabled={busy}
          onPress={() => void run(signInWithApple)}
        />
        <Button
          variant="secondary"
          height={50}
          fontSize={15}
          icon={GoogleLogoIcon}
          iconSize={20}
          label="Continuer avec Google"
          disabled={busy}
          onPress={() => void run(signInWithGoogle)}
        />
        {state !== 'idle' ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.status, { color: busy ? colors.accent300 : colors.neutral300 }]}
          >
            {STATUS_TEXT[state]}
          </Text>
        ) : null}
        <Text style={styles.legal}>
          En continuant, tu acceptes les{' '}
          <Text accessibilityRole="link" style={styles.link} onPress={() => openWebPage(TERMS_URL)}>
            {"conditions d'utilisation"}
          </Text>{' '}
          et la{' '}
          <Text
            accessibilityRole="link"
            style={styles.link}
            onPress={() => openWebPage(PRIVACY_URL)}
          >
            politique de confidentialité
          </Text>
          .
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  content: {
    position: 'absolute',
    left: 24,
    right: 24,
    gap: 12,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: radii.rLg,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 24px ${colors.accentA35}`,
  },
  brandName: {
    fontFamily: fonts.medium,
    fontSize: 20,
    lineHeight: 20 * 1.55,
    color: colors.text,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  text: {
    ...typography.body,
    marginBottom: 10,
    color: colors.neutral400,
  },
  status: {
    ...typography.meta,
    textAlign: 'center',
  },
  legal: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.5,
    color: colors.neutral500,
  },
  link: {
    color: colors.accent,
    textDecorationLine: 'underline',
  },
});
