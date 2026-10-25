import { router } from 'expo-router';
import {
  CaretRightIcon,
  MagnifyingGlassIcon,
  ShareNetworkIcon,
  UserCirclePlusIcon,
  UserPlusIcon,
  UsersThreeIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfile, type Profile } from '@/api/profile';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SkeletonBox } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { openActionSheet, openInviteSheet } from '@/store/ui';
import { colors, radii, spacing } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

import { SettingsGroup, SettingsRow } from '../profile/SettingsGroup';
import { SettingsContent } from '../profile/SettingsContent';
import { openFriends } from './navigation';

/**
 * Onglet Profil (retours du 2026-10-24) : ma photo, mon nom et mon pseudo, mes amis et mes
 * demandes, puis les réglages. Photo et nom sont ceux du compte, le pseudo est définitif.
 */
export function MyProfileScreen() {
  const insets = useSafeAreaInsets();
  const query = useProfile();
  const profile = query.data;
  const [refreshing, setRefreshing] = useState(false);
  const refresh = () => {
    setRefreshing(true);
    void query.refetch().finally(() => setRefreshing(false));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <OfflineBanner />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <ScreenHeader
          title="Profil"
          actions={
            <Button
              variant="icon"
              height={44}
              icon={UserPlusIcon}
              iconSize={22}
              color={colors.text}
              accessibilityLabel="Ajouter un ami"
              onPress={openAddFriend}
            />
          }
        />
        {profile ? (
          <SettingsContent profile={profile} first={<Me profile={profile} />} />
        ) : showsLoadError(query) ? (
          <LoadError onRetry={() => void query.refetch()} />
        ) : (
          <View style={styles.loading}>
            <SkeletonBox height={88} radius={radii.rLg} />
            <SkeletonBox height={200} radius={radii.rLg} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/** « + » : chercher un membre à ajouter, ou l'inviter s'il n'est pas encore sur Zabava. */
function openAddFriend() {
  openActionSheet({
    title: 'Ajouter un ami',
    options: [
      {
        label: 'Chercher un membre',
        icon: MagnifyingGlassIcon,
        onPress: () => router.push({ pathname: '/search', params: { tab: 'members' } }),
      },
      { label: 'Inviter', icon: ShareNetworkIcon, onPress: openInviteSheet },
    ],
  });
}

/** Moi, puis « Mes amis · n » et mes demandes reçues. */
function Me({ profile }: { profile: Profile }) {
  const username = profile.username ?? '';
  const name = profile.displayName || username;
  const friends = profile.friendsCount ?? 0;
  const requests = profile.followRequestsCount ?? 0;
  return (
    <>
      <View style={styles.identity}>
        <Avatar size={88} name={name} uri={profile.avatarUrl} mine />
        <View style={styles.names}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          <Text numberOfLines={1} style={styles.handle}>
            @{username}
          </Text>
        </View>
      </View>
      <SettingsGroup label="Amis">
        <SettingsRow
          label="Mes amis"
          icon={UsersThreeIcon}
          accessibilityLabel={`Mes amis, ${friends}`}
          onPress={() => openFriends(username)}
        >
          <Text style={styles.count}>{friends}</Text>
          <CaretRightIcon size={16} color={colors.neutral600} />
        </SettingsRow>
        {requests > 0 ? (
          <SettingsRow
            label="Demandes d'amis"
            icon={UserCirclePlusIcon}
            accessibilityLabel={`Demandes d'amis, ${requests}`}
            onPress={() => router.push('/follow-requests')}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{requests}</Text>
            </View>
            <CaretRightIcon size={16} color={colors.neutral600} />
          </SettingsRow>
        ) : null}
      </SettingsGroup>
    </>
  );
}

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
    paddingTop: 16,
    paddingHorizontal: spacing.screenX,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  names: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    ...typography.titleXL,
    color: colors.text,
  },
  handle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    color: colors.neutral400,
  },
  count: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
  badge: {
    height: 22,
    minWidth: 22,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.rPill,
    backgroundColor: colors.accent,
  },
  badgeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    color: colors.bg,
  },
});
