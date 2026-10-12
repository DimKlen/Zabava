import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

/**
 * Lien de retour OAuth (zabava://auth/callback). Sur Android, le routeur l'ouvre
 * aussi : l'écran reste vide pendant que /login échange le code et redirige.
 */
export default function AuthCallback() {
  return <View style={styles.screen} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
