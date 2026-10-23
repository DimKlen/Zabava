import Constants from 'expo-constants';
import { Image } from 'expo-image';
import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  ShieldCheckIcon,
  SignOutIcon,
  TelevisionSimpleIcon,
  TranslateIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProviders } from '@/api/catalog';
import { useProfile, type Profile } from '@/api/profile';
import { Button } from '@/components/Button';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SkeletonBox } from '@/components/Skeleton';
import { Switch } from '@/components/Switch';
import { Text } from '@/components/Text';
import { LANGUAGES, languageChoice, languageLabel } from '@/domain/onboarding';
import {
  DIGEST_HOURS,
  NOTIFICATION_SWITCHES,
  digestLabel,
  platformsSummary,
  type NotificationSwitch,
} from '@/domain/profile';
import { goBack } from '@/lib/navigation';
import { ensureNotificationPermission } from '@/lib/notifications';
import { openActionSheet } from '@/store/ui';
import { colors, radii, spacing } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { PlatformsSheet } from './PlatformsSheet';
import {
  changeLanguage,
  confirmDeleteAccount,
  confirmSignOut,
  updatePreference,
} from './profileActions';
import { SettingsGroup, SettingsRow } from './SettingsGroup';

/** Logos officiels (themoviedb.org/about/logos-attribution, justwatch.com), hauteur 22. */
const TMDB_LOGO = require('../../../assets/logos/tmdb.svg');
const TMDB_LOGO_RATIO = 273.42 / 35.52;
const JUSTWATCH_LOGO = require('../../../assets/logos/justwatch.png');
const JUSTWATCH_LOGO_RATIO = 505 / 76;

/**
 * Réglages (specs/docs/09 §9.2, specs/social/docs/04 §4.13) : ancien onglet Profil sans le bloc
 * compte, remplacé par Mon profil ; ouvert depuis l'engrenage.
 */
export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const query = useProfile();
  const profile = query.data;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.bar}>
          <Button
            variant="icon"
            height={44}
            icon={CaretLeftIcon}
            iconSize={22}
            color={colors.text}
            accessibilityLabel="Retour"
            onPress={goBack}
          />
          <Text accessibilityRole="header" style={styles.title}>
            Réglages
          </Text>
        </View>
        {profile ? (
          <SettingsContent profile={profile} />
        ) : showsLoadError(query) ? (
          <LoadError onRetry={() => void query.refetch()} />
        ) : (
          <View style={styles.loading}>
            <SkeletonBox height={200} radius={radii.rLg} style={styles.loadingGroup} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SettingsContent({ profile }: { profile: Profile }) {
  const [platformsOpen, setPlatformsOpen] = useState(false);
  // Pendant le chargement : rien plutôt qu'un « Aucune » trompeur.
  const providers = useProviders().data;
  const prefs = profile.notificationPrefs;

  const pick = <V extends string>(
    title: string,
    options: readonly { value: V; label: string }[],
    current: string | undefined,
    onPick: (value: V) => void,
  ) =>
    openActionSheet({
      title,
      options: options.map((option) => ({
        label: option.label,
        icon: option.value === current ? CheckIcon : undefined,
        onPress: () => onPick(option.value),
      })),
    });

  const toggleNotification = async (key: NotificationSwitch['key'], value: boolean) => {
    // Activer demande la permission système (ou ouvre les réglages si elle est bloquée).
    if (value && !(await ensureNotificationPermission())) return;
    await updatePreference({ notificationPrefs: { [key]: value } });
  };

  return (
    <>
      <View style={styles.groups}>
        <SettingsGroup label="Préférences">
          <SettingsRow
            label="Langue"
            icon={TranslateIcon}
            onPress={() =>
              pick(
                'Langue',
                LANGUAGES,
                languageChoice(profile.language),
                (language) => void changeLanguage({ language }),
              )
            }
          >
            <Value text={languageLabel(profile.language)} />
          </SettingsRow>
          <SettingsRow
            label="Mes plateformes"
            icon={TelevisionSimpleIcon}
            onPress={() => setPlatformsOpen(true)}
          >
            <Text numberOfLines={1} style={styles.platforms}>
              {providers ? platformsSummary(providers, profile.providerIds ?? []) : ''}
            </Text>
            <CaretRightIcon size={16} color={colors.neutral600} />
          </SettingsRow>
          <SettingsRow label="Anti-spoiler" icon={ShieldCheckIcon}>
            <Switch
              value={profile.spoilerProtection ?? false}
              onValueChange={(value) => void updatePreference({ spoilerProtection: value })}
              accessibilityLabel="Anti-spoiler"
            />
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup label="Notifications">
          {NOTIFICATION_SWITCHES.map((item) => (
            <SettingsRow key={item.key} label={item.label}>
              <Switch
                value={prefs?.[item.key] ?? true}
                onValueChange={(value) => void toggleNotification(item.key, value)}
                accessibilityLabel={item.label}
              />
            </SettingsRow>
          ))}
          <SettingsRow
            label="Récapitulatif quotidien"
            onPress={() =>
              pick(
                'Récapitulatif quotidien',
                DIGEST_HOURS,
                String(prefs?.digestHour ?? 9),
                (hour) =>
                  void updatePreference({ notificationPrefs: { digestHour: Number(hour) } }),
              )
            }
          >
            <Value text={digestLabel(prefs?.digestHour ?? 9)} />
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup label="À propos">
          <View style={styles.about}>
            <View style={styles.logos}>
              <Image
                source={TMDB_LOGO}
                style={styles.tmdbLogo}
                contentFit="contain"
                accessibilityLabel="TMDB"
              />
              <Image
                source={JUSTWATCH_LOGO}
                style={styles.justWatchLogo}
                contentFit="contain"
                accessibilityLabel="JustWatch"
              />
            </View>
            <Text style={styles.aboutText}>
              Ce produit utilise l&apos;API TMDB sans être approuvé ni certifié par TMDB.
              Plateformes de diffusion fournies par JustWatch. Notes via OMDb.
            </Text>
            <Text style={styles.version}>Version {Constants.expoConfig?.version ?? ''}</Text>
          </View>
        </SettingsGroup>

        <View style={styles.actions}>
          <Button
            variant="secondary"
            height={46}
            icon={SignOutIcon}
            iconSize={18}
            label="Se déconnecter"
            onPress={confirmSignOut}
          />
          <Button
            variant="ghost"
            height={44}
            label="Supprimer mon compte"
            color={colors.neutral400}
            onPress={confirmDeleteAccount}
          />
        </View>
      </View>
      <PlatformsSheet visible={platformsOpen} onClose={() => setPlatformsOpen(false)} />
    </>
  );
}

/** Valeur d'une ligne à choix : texte 14 `neutral300` et CaretDown. */
function Value({ text }: { text: string | undefined }) {
  return (
    <>
      <Text numberOfLines={1} style={styles.value}>
        {text}
      </Text>
      <CaretDownIcon size={16} color={colors.neutral300} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  title: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 18 * 1.3,
    color: colors.text,
  },
  content: {
    paddingBottom: 24,
  },
  loading: {
    gap: 16,
    paddingTop: 12,
    paddingHorizontal: spacing.screenX,
  },
  loadingGroup: {
    marginTop: 8,
  },
  groups: {
    gap: 20,
    paddingTop: 16,
    paddingHorizontal: spacing.screenX,
  },
  value: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    color: colors.neutral300,
  },
  platforms: {
    flexShrink: 1,
    maxWidth: 150,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
  about: {
    gap: 10,
    padding: 14,
    backgroundColor: colors.surface,
  },
  logos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tmdbLogo: {
    height: 22,
    aspectRatio: TMDB_LOGO_RATIO,
  },
  justWatchLogo: {
    height: 22,
    aspectRatio: JUSTWATCH_LOGO_RATIO,
  },
  aboutText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: colors.neutral400,
  },
  version: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    color: colors.neutral500,
  },
  actions: {
    gap: 8,
    paddingBottom: 12,
  },
});
