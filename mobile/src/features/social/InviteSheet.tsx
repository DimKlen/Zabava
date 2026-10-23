import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { LinkIcon, ScanIcon, ShareNetworkIcon, XIcon } from 'phosphor-react-native';
import { Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { config } from '@/api/config';
import { useProfile } from '@/api/profile';
import { Avatar } from '@/components/Avatar';
import { BottomSheet, SheetHandle } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { inviteLink, inviteMessage } from '@/domain/social/links';
import { closeInviteSheet, showToast, useUiStore } from '@/store/ui';
import { colors, durations, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

const QR_SIZE = 200;
/** Marge d'environ 2 modules autour du code (docs/03 › QRCard). */
const QR_MARGIN = 10;
const AVATAR = 48;
const AVATAR_BORDER = 4;

/** Sheet « Inviter » (specs/social/docs/04 §4.7), montée une fois dans le layout racine. */
export function InviteSheetHost() {
  const open = useUiStore((s) => s.inviteOpen);
  const profile = useProfile(open).data;
  const username = profile?.username;
  const name = profile?.displayName || username || '';

  return (
    <BottomSheet
      visible={open && Boolean(username)}
      onClose={closeInviteSheet}
      enterDuration={durations.sheetPlatforms}
      panelStyle={styles.panel}
    >
      <SheetHandle />
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Inviter
        </Text>
        <Button
          variant="icon"
          height={44}
          icon={XIcon}
          iconSize={20}
          color={colors.text}
          accessibilityLabel="Fermer"
          onPress={closeInviteSheet}
        />
      </View>
      {username ? (
        <>
          <QrCard username={username} name={name} avatarUrl={profile?.avatarUrl} />
          <Button
            variant="primary"
            height={48}
            fontSize={15}
            icon={ShareNetworkIcon}
            label="Partager mon lien"
            onPress={() =>
              void Share.share({ message: inviteMessage(config.inviteDomain, username) }).catch(
                () => undefined,
              )
            }
          />
          <View style={styles.row}>
            <Button
              variant="secondary"
              height={44}
              icon={LinkIcon}
              label="Copier le lien"
              onPress={() => {
                void Clipboard.setStringAsync(inviteLink(config.inviteDomain, username))
                  .then(() => showToast('Lien copié'))
                  .catch(() => undefined);
              }}
              style={styles.half}
            />
            <Button
              variant="secondary"
              height={44}
              icon={ScanIcon}
              label="Scanner un code"
              onPress={() => {
                closeInviteSheet();
                router.push('/scan');
              }}
              style={styles.half}
            />
          </View>
        </>
      ) : null}
    </BottomSheet>
  );
}

/** QR code du lien de profil, avatar au centre, @pseudo dessous (docs/03 › QRCard). */
function QrCard({
  username,
  name,
  avatarUrl,
}: {
  username: string;
  name: string;
  avatarUrl?: string | null;
}) {
  return (
    <View style={styles.card}>
      <View accessible accessibilityLabel="QR code de ton profil" style={styles.qr}>
        <QRCode
          value={inviteLink(config.inviteDomain, username)}
          size={QR_SIZE}
          ecl="H"
          color={colors.text}
          backgroundColor={colors.bg}
          quietZone={QR_MARGIN}
        />
        <View style={styles.qrAvatar}>
          <Avatar size={AVATAR} name={name} uri={avatarUrl} mine />
        </View>
      </View>
      <Text style={styles.handle}>@{username}</Text>
      <Text style={styles.link}>
        {config.inviteDomain}/u/{username}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 12,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 18 * 1.3,
    color: colors.text,
  },
  card: {
    alignItems: 'center',
    gap: 8,
    padding: 20,
    borderRadius: radii.rLg,
    backgroundColor: colors.bg,
  },
  qr: {
    width: QR_SIZE,
    height: QR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrAvatar: {
    position: 'absolute',
    borderWidth: AVATAR_BORDER,
    borderColor: colors.bg,
    borderRadius: (AVATAR + AVATAR_BORDER * 2) / 2,
  },
  handle: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 16 * 1.3,
    color: colors.text,
  },
  link: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    color: colors.neutral500,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  half: {
    flex: 1,
  },
});
