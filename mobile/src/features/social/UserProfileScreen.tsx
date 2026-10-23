import { router } from 'expo-router';
import { CaretLeftIcon, DotsThreeIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/http';
import {
  flatItems,
  rememberVisit,
  useUserProfile,
  useUserTitles,
  type UserProfile,
} from '@/api/social';
import { openMemberMenu } from '@/api/socialActions';
import { Button } from '@/components/Button';
import { FollowButton } from '@/components/FollowButton';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SkeletonBox } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { profileAccess } from '@/domain/social/members';
import { defaultSegment, segmentFor, type ProfileSegment } from '@/domain/social/profileLists';
import type { MediaType } from '@/domain/types';
import { goBack } from '@/lib/navigation';
import { showToast } from '@/store/ui';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { openConnections } from './navigation';
import { ProfileContent } from './ProfileContent';
import { ProfileHeader } from './ProfileHeader';
import { ProfileNotice } from './ProfileNotice';

/** Profil d'un autre membre (specs/social/docs/04 §4.4). */
export function UserProfileScreen({ username }: { username: string }) {
  const insets = useSafeAreaInsets();
  const query = useUserProfile(username);
  const profile = query.data;
  const notFound = query.error instanceof ApiError && query.error.status === 404;

  // Mon propre pseudo : l'onglet Profil.
  useEffect(() => {
    if (profile?.isMe) router.replace('/(tabs)/profile');
  }, [profile?.isMe]);

  // Profil ouvert : en tête des « Personnes suivies récemment ».
  const found = Boolean(profile && !profile.isMe);
  useEffect(() => {
    if (found) void rememberVisit(username).catch(() => undefined);
  }, [found, username]);

  let body;
  if (profile && !profile.isMe) body = <OtherProfile profile={profile} />;
  else if (notFound) body = <NotFound />;
  else if (showsLoadError(query)) {
    body = (
      <>
        <Bar />
        <LoadError onRetry={() => void query.refetch()} />
      </>
    );
  } else {
    body = (
      <>
        <Bar />
        <HeaderSkeleton />
      </>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <OfflineBanner />
      {body}
    </View>
  );
}

function Bar({ profile }: { profile?: UserProfile }) {
  return (
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
      {profile ? (
        <Button
          variant="icon"
          height={44}
          icon={DotsThreeIcon}
          iconSize={22}
          color={colors.text}
          accessibilityLabel={`Options pour @${profile.username}`}
          onPress={() => openMemberMenu(profile)}
        />
      ) : null}
    </View>
  );
}

function OtherProfile({ profile }: { profile: UserProfile }) {
  const [tab, setTab] = useState<MediaType>('movie');
  const [segment, setSegment] = useState<ProfileSegment>(defaultSegment('movie'));
  const access = profileAccess(profile);
  const visible = !access.locked && !access.blocked;
  const titles = useUserTitles(profile.username, tab, segment, visible);

  // Compteurs d'un profil privé non suivi ou bloqué : pas de liste, un toast.
  const counters = (kind: 'followers' | 'following') => () => {
    if (access.locked) showToast('Ce profil est privé');
    else if (access.blocked) showToast('Tu as bloqué ce profil');
    else openConnections(profile.username, kind);
  };

  return (
    <ProfileContent
      header={
        <>
          <Bar profile={profile} />
          <ProfileHeader
            isMe={false}
            profile={profile}
            onFollowers={counters('followers')}
            onFollowing={counters('following')}
          />
          <View style={styles.follow}>
            <FollowButton member={profile} size="normal" />
          </View>
        </>
      }
      notice={
        access.blocked ? (
          <ProfileNotice kind="blocked" username={profile.username} />
        ) : access.locked ? (
          <ProfileNotice kind="locked" username={profile.username} />
        ) : null
      }
      tab={tab}
      segment={segment}
      onTab={(next) => {
        setTab(next);
        setSegment(segmentFor(next, segment));
      }}
      onSegment={setSegment}
      items={titles.data ? flatItems(titles.data.pages) : undefined}
      error={showsLoadError(titles)}
      onRetry={() => void titles.refetch()}
      onEndReached={() => {
        if (titles.hasNextPage && !titles.isFetchingNextPage) void titles.fetchNextPage();
      }}
    />
  );
}

function NotFound() {
  return (
    <>
      <Bar />
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>
          Ce profil n&apos;existe pas ou n&apos;est plus disponible
        </Text>
        <Button variant="secondary" height={44} label="Retour" onPress={goBack} />
      </View>
    </>
  );
}

function HeaderSkeleton() {
  return (
    <View style={styles.skeleton}>
      <SkeletonBox width={88} height={88} radius={44} />
      <View style={styles.skeletonText}>
        <SkeletonBox width={160} height={24} radius={radii.rSm} />
        <SkeletonBox width={100} height={16} radius={radii.rSm} />
        <SkeletonBox width={180} height={20} radius={radii.rSm} />
      </View>
    </View>
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
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  follow: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  notFound: {
    alignItems: 'flex-start',
    gap: 16,
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  notFoundText: {
    fontFamily: fonts.medium,
    fontSize: 17,
    lineHeight: 17 * 1.3,
    color: colors.text,
  },
  skeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  skeletonText: {
    gap: 8,
  },
});
