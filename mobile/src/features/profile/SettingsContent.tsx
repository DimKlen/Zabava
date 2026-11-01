import Constants from 'expo-constants';
import { Image } from 'expo-image';
import {
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  GlobeHemisphereWestIcon,
  ShieldCheckIcon,
  SignOutIcon,
  TelevisionSimpleIcon,
  TranslateIcon,
} from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useProviders } from '@/api/catalog';
import type { Profile } from '@/api/profile';
import { Button } from '@/components/Button';
import { Switch } from '@/components/Switch';
import { Text } from '@/components/Text';
import {
  DIGEST_HOURS,
  NOTIFICATION_SWITCHES,
  REGIONS,
  digestLabel,
  platformsSummary,
  regionLabel,
  type NotificationSwitch,
} from '@/domain/profile';
import { LANGUAGE_NAMES, useT, useLanguageStore } from '@/i18n';
import { useLanguageOptions } from '@/i18n/useLanguageOptions';
import { ensureNotificationPermission } from '@/lib/notifications';
import { openActionSheet } from '@/store/ui';
import { colors, spacing } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { PlatformsSheet } from './PlatformsSheet';
import {
  changeCatalogSetting,
  chooseLanguage,
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

type Props = {
  profile: Profile;
  /** En tête des groupes, avec le même espacement (onglet Profil : moi et mes amis). */
  first?: ReactNode;
};

/** Réglages (specs/docs/09 §9.2, specs/social/docs/04 §4.13), dans l'onglet Profil. */
export function SettingsContent({ profile, first }: Props) {
  const { t, language } = useT();
  const languageOptions = useLanguageOptions();
  const languagePreference = useLanguageStore((s) => s.preference);
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
        {first}
        <SettingsGroup label={t('settings.preferences')}>
          <SettingsRow
            label={t('language.label')}
            icon={TranslateIcon}
            onPress={() =>
              pick(
                t('language.label'),
                languageOptions,
                languagePreference,
                (choice) => void chooseLanguage(choice),
              )
            }
          >
            <Value
              text={languagePreference === 'auto' ? t('language.auto') : LANGUAGE_NAMES[language]}
            />
          </SettingsRow>
          <SettingsRow
            label={t('settings.region')}
            icon={GlobeHemisphereWestIcon}
            onPress={() =>
              pick(
                t('settings.region'),
                REGIONS,
                profile.region,
                (region) => void changeCatalogSetting({ region }),
              )
            }
          >
            <Value text={regionLabel(profile.region)} />
          </SettingsRow>
          <SettingsRow
            label={t('settings.platforms')}
            icon={TelevisionSimpleIcon}
            onPress={() => setPlatformsOpen(true)}
          >
            <Text numberOfLines={1} style={styles.platforms}>
              {providers ? platformsSummary(providers, profile.providerIds ?? []) : ''}
            </Text>
            <CaretRightIcon size={16} color={colors.neutral600} />
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup label={t('settings.notifications')}>
          {NOTIFICATION_SWITCHES.map((item) => (
            <SettingsRow key={item.key} label={t(`notif.${item.key}`)}>
              <Switch
                value={prefs?.[item.key] ?? true}
                onValueChange={(value) => void toggleNotification(item.key, value)}
                accessibilityLabel={t(`notif.${item.key}`)}
              />
            </SettingsRow>
          ))}
          <SettingsRow
            label={t('settings.digest')}
            onPress={() =>
              pick(
                t('settings.digest'),
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

        {/* Déplacé des Préférences (specs/social/docs/04 §4.13). */}
        <SettingsGroup label={t('settings.spoilerGroup')}>
          <SettingsRow label={t('settings.spoiler')} icon={ShieldCheckIcon}>
            <Switch
              value={profile.spoilerProtection ?? false}
              onValueChange={(value) => void updatePreference({ spoilerProtection: value })}
              accessibilityLabel={t('settings.spoiler')}
            />
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup label={t('settings.about')}>
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
            <Text style={styles.aboutText}>{t('settings.aboutText')}</Text>
            <Text style={styles.version}>
              {t('settings.version', { version: Constants.expoConfig?.version ?? '' })}
            </Text>
          </View>
        </SettingsGroup>

        <View style={styles.actions}>
          <Button
            variant="secondary"
            height={46}
            icon={SignOutIcon}
            iconSize={18}
            label={t('settings.signOut')}
            onPress={confirmSignOut}
          />
          <Button
            variant="ghost"
            height={44}
            label={t('settings.deleteAccount')}
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
