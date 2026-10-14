import Constants from 'expo-constants';
import { Image } from 'expo-image';
import {
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  GlobeIcon,
  ShieldCheckIcon,
  SignOutIcon,
  TelevisionSimpleIcon,
  TranslateIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRegionProviders } from '@/api/catalog';
import { useProfile, type Profile } from '@/api/profile';
import { Button } from '@/components/Button';
import { LoadError } from '@/components/LoadError';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SkeletonBox } from '@/components/Skeleton';
import { Switch } from '@/components/Switch';
import { Tag } from '@/components/Tag';
import { LANGUAGES, REGIONS } from '@/domain/onboarding';
import {
  DIGEST_HOURS,
  NOTIFICATION_SWITCHES,
  accountLine,
  digestLabel,
  platformsSummary,
  type NotificationSwitch,
} from '@/domain/profile';
import { ensureNotificationPermission } from '@/lib/notifications';
import { openActionSheet } from '@/store/ui';
import { colors, radii, spacing } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { PlatformsSheet } from './PlatformsSheet';
import {
  changeRegionOrLanguage,
  confirmDeleteAccount,
  confirmSignOut,
  updatePreference,
} from './profileActions';
import { SettingsGroup, SettingsRow } from './SettingsGroup';

/** Profil (specs/docs/09 §9.2) : compte, préférences, notifications, à propos. */
export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const query = useProfile();
  const profile = query.data;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Profil" />
        {profile ? (
          <ProfileContent profile={profile} />
        ) : query.isError ? (
          <LoadError onRetry={() => void query.refetch()} />
        ) : (
          <View style={styles.loading}>
            <SkeletonBox width={56} height={56} radius={28} />
            <SkeletonBox height={200} radius={radii.rLg} style={styles.loadingGroup} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ProfileContent({ profile }: { profile: Profile }) {
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const providers = useRegionProviders(profile.region).data ?? [];
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
      <Account profile={profile} />
      <View style={styles.groups}>
        <SettingsGroup label="Préférences">
          <SettingsRow
            label="Région"
            icon={GlobeIcon}
            onPress={() =>
              pick(
                'Région',
                REGIONS,
                profile.region,
                (region) => void changeRegionOrLanguage({ region }),
              )
            }
          >
            <Value
              text={REGIONS.find((r) => r.value === profile.region)?.label ?? profile.region}
            />
          </SettingsRow>
          <SettingsRow
            label="Langue"
            icon={TranslateIcon}
            onPress={() =>
              pick(
                'Langue',
                LANGUAGES,
                profile.language,
                (language) => void changeRegionOrLanguage({ language }),
              )
            }
          >
            <Value
              text={LANGUAGES.find((l) => l.value === profile.language)?.label ?? profile.language}
            />
          </SettingsRow>
          <SettingsRow
            label="Mes plateformes"
            icon={TelevisionSimpleIcon}
            onPress={() => setPlatformsOpen(true)}
          >
            <Text numberOfLines={1} style={styles.platforms}>
              {platformsSummary(providers, profile.providerIds ?? [])}
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
              <Tag label="TMDB" variant="outline" />
              <Tag label="JustWatch" variant="outline" />
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

/** Compte : photo OAuth ou initiale, nom, « email · Google ». */
function Account({ profile }: { profile: Profile }) {
  const name = profile.displayName || profile.email || '';
  return (
    <View style={styles.account}>
      <View style={styles.avatar}>
        {profile.avatarUrl ? (
          <Image
            source={{ uri: profile.avatarUrl }}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.accountText}>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <Text numberOfLines={1} style={styles.email}>
          {accountLine(profile.email, profile.authProvider)}
        </Text>
      </View>
    </View>
  );
}

const AVATAR = 56;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
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
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 12,
    paddingHorizontal: spacing.screenX,
    paddingBottom: 4,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent800,
  },
  initial: {
    fontFamily: fonts.medium,
    fontSize: 20,
    lineHeight: 20 * 1.2,
    color: colors.accent100,
  },
  accountText: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: 17,
    lineHeight: 17 * 1.3,
    color: colors.text,
  },
  email: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
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
    gap: 8,
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
