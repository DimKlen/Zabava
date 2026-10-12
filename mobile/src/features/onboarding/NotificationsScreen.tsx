import { router } from 'expo-router';
import {
  BellRingingIcon,
  FilmSlateIcon,
  PlayCircleIcon,
  TelevisionSimpleIcon,
  type Icon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfile, updateProfile } from '@/api/profile';
import { Button } from '@/components/Button';
import { NOTIFICATIONS_OFF } from '@/domain/onboarding';
import { registerPushToken, requestNotificationPermission } from '@/lib/notifications';
import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

const ITEMS: readonly { icon: Icon; title: string; text: string }[] = [
  {
    icon: TelevisionSimpleIcon,
    title: 'Nouveaux épisodes',
    text: "Le jour de diffusion, à l'heure locale.",
  },
  {
    icon: FilmSlateIcon,
    title: 'Sorties en salle',
    text: 'Quand un film de ta liste sort au cinéma.',
  },
  {
    icon: PlayCircleIcon,
    title: 'Disponibilité en streaming',
    text: 'Quand un film arrive sur tes plateformes.',
  },
];

/** Explication des notifications, puis vraie demande système (specs/docs/05 §5.3). */
export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const [busy, setBusy] = useState(false);

  const goToWatchlist = async () => {
    // « Passer » à l'étape 3 n'enregistre pas la fin de l'onboarding : on la note ici
    // pour ne pas revenir à l'onboarding au prochain lancement.
    if (!profile.data?.onboardedAt) {
      await updateProfile({ onboardedAt: new Date().toISOString() }).catch(() => undefined);
    }
    router.replace('/(tabs)/watchlist');
  };

  const enable = async () => {
    setBusy(true);
    try {
      if (await requestNotificationPermission()) {
        await registerPushToken();
      } else {
        await updateProfile({ notificationPrefs: NOTIFICATIONS_OFF });
      }
    } catch {
      // Jeton indisponible (Expo Go, hors ligne) : l'utilisateur continue quand même.
    }
    await goToWatchlist();
  };

  return (
    <View style={[styles.screen, { paddingTop: 120, paddingBottom: Math.max(34, insets.bottom) }]}>
      <View style={styles.icon}>
        <BellRingingIcon size={32} color={colors.accent} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        Ne rate aucune sortie
      </Text>
      <Text style={styles.text}>
        {"On t'envoie au plus une alerte par titre et par jour, seulement pour ce que tu suis."}
      </Text>
      <View style={styles.list}>
        {ITEMS.map(({ icon: ItemIcon, title, text }) => (
          <View key={title} style={styles.item}>
            <ItemIcon size={22} color={colors.accent} />
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>{title}</Text>
              <Text style={styles.itemDescription}>{text}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <Button
          variant="primary"
          height={50}
          fontSize={15}
          label="Activer les notifications"
          disabled={busy}
          onPress={() => void enable()}
        />
        <Button
          variant="ghost"
          height={44}
          label="Plus tard"
          color={colors.neutral400}
          disabled={busy}
          onPress={() => void goToWatchlist()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: colors.bg,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent900,
  },
  title: {
    ...typography.h1Notif,
    marginBottom: 12,
    color: colors.text,
  },
  text: {
    ...typography.body,
    marginBottom: 28,
    color: colors.neutral400,
  },
  list: {
    gap: 18,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  itemDescription: {
    ...typography.meta,
    color: colors.neutral400,
  },
  actions: {
    marginTop: 'auto',
    gap: 8,
  },
});
