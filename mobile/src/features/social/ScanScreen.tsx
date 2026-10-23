import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { XIcon } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { config } from '@/api/config';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { usernameFromLink } from '@/domain/social/links';
import { hapticSuccess } from '@/lib/haptics';
import { goBack } from '@/lib/navigation';
import { showToast } from '@/store/ui';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { openUser } from './navigation';

const FRAME = 240;

/** Scanner un code Zabava (specs/social/docs/04 §4.8) : modal plein écran. */
export function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  // Un code non reconnu n'affiche son toast qu'une fois ; un code reconnu n'ouvre qu'un profil.
  const seen = useRef(new Set<string>());
  const done = useRef(false);

  // Première ouverture : la permission est demandée tout de suite.
  const undetermined = permission?.status === 'undetermined';
  useEffect(() => {
    if (undetermined) void requestPermission();
  }, [undetermined, requestPermission]);

  const scanned = ({ data }: { data: string }) => {
    if (done.current || seen.current.has(data)) return;
    const username = usernameFromLink(data, config.inviteDomain, config.deeplinkScheme);
    if (!username) {
      seen.current.add(data);
      showToast("Ce code n'est pas un code Zabava");
      return;
    }
    done.current = true;
    hapticSuccess();
    router.back();
    openUser(username);
  };

  let body;
  if (!permission || undetermined) {
    body = <View style={styles.center} />;
  } else if (!permission.granted) {
    body = (
      <View style={styles.center}>
        <Text style={styles.text}>Autorise l&apos;accès à la caméra pour scanner un code.</Text>
        <Button
          variant="primary"
          height={44}
          label="Ouvrir les réglages"
          onPress={() => void Linking.openSettings().catch(() => undefined)}
        />
      </View>
    );
  } else {
    body = (
      <>
        <View style={styles.center}>
          <View style={styles.frame}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned}
            />
          </View>
        </View>
        <Text style={styles.text}>Vise le code Zabava d&apos;un ami pour ouvrir son profil.</Text>
      </>
    );
  }

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }]}
    >
      <View style={styles.bar}>
        <Text accessibilityRole="header" style={styles.title}>
          Scanner un code
        </Text>
        <Button
          variant="icon"
          height={44}
          icon={XIcon}
          iconSize={20}
          color={colors.text}
          accessibilityLabel="Fermer"
          onPress={goBack}
        />
      </View>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: colors.neutral900,
  },
  bar: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 17,
    lineHeight: 17 * 1.3,
    color: colors.text,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  frame: {
    width: FRAME,
    height: FRAME,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.bg,
  },
  text: {
    marginBottom: 16,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    color: colors.neutral300,
    textAlign: 'center',
  },
});
