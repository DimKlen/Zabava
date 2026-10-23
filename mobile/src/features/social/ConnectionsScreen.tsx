import { router } from 'expo-router';
import {
  CaretLeftIcon,
  MagnifyingGlassIcon,
  UserMinusIcon,
  UsersThreeIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfile } from '@/api/profile';
import { flatItems, useConnections, useUserProfile, type ConnectionsKind } from '@/api/social';
import { removeFollower } from '@/api/socialActions';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { MemberRow } from '@/components/MemberRow';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SkeletonBox } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import type { Member } from '@/domain/social/members';
import { stripAccents } from '@/domain/social/username';
import { goBack } from '@/lib/navigation';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { openActionSheet, openInviteSheet } from '@/store/ui';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { openUser } from './navigation';

const TABS = [
  { key: 'followers', label: 'Abonnés' },
  { key: 'following', label: 'Abonnements' },
] as const;

/** Au-delà, le filtre passe par le serveur (`?q=`). */
const LOCAL_FILTER_MAX = 200;
const FILTER_DELAY_MS = 300;

type Props = { username: string; initialTab: ConnectionsKind };

/** Abonnés / Abonnements (specs/social/docs/04 §4.5). */
export function ConnectionsScreen({ username, initialTab }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<ConnectionsKind>(initialTab);
  const [filter, setFilter] = useState('');
  const me = useProfile().data?.username;
  const owner = useUserProfile(username).data;
  const isMine = username === me;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <OfflineBanner />
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
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {owner?.displayName ?? ''}
        </Text>
      </View>
      <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} />
      <View style={styles.filter}>
        <TextField
          height={40}
          icon={MagnifyingGlassIcon}
          value={filter}
          onChangeText={setFilter}
          placeholder="Filtrer"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Filtrer"
        />
      </View>
      <ConnectionsList
        key={tab}
        username={username}
        kind={tab}
        filter={filter}
        me={me}
        isMine={isMine}
      />
    </View>
  );
}

function ConnectionsList({
  username,
  kind,
  filter,
  me,
  isMine,
}: {
  username: string;
  kind: ConnectionsKind;
  filter: string;
  me: string | undefined;
  isMine: boolean;
}) {
  const all = useConnections(username, kind, '');
  const loaded = flatItems(all.data?.pages);
  // Tout est chargé et la liste est courte : filtre local, sans requête.
  const local = Boolean(all.data) && !all.hasNextPage && loaded.length <= LOCAL_FILTER_MAX;
  const query = stripAccents(useDebouncedValue(filter, FILTER_DELAY_MS).trim());
  const remote = useConnections(username, kind, local ? '' : query);
  const source = local || !query ? all : remote;

  const needle = stripAccents(filter.trim());
  const members = local
    ? loaded.filter(
        (member) =>
          !needle ||
          stripAccents(member.username).includes(needle) ||
          stripAccents(member.displayName).includes(needle),
      )
    : flatItems(source.data?.pages);

  if (showsLoadError(source)) return <LoadError onRetry={() => void source.refetch()} />;
  if (!source.data) return <RowsSkeleton />;

  const more = (member: Member) =>
    openActionSheet({
      title: `@${member.username}`,
      options: [
        { label: 'Retirer cet abonné', icon: UserMinusIcon, onPress: () => removeFollower(member) },
      ],
    });

  return (
    <FlatList
      data={members}
      keyExtractor={(member) => member.username}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <MemberRow
          member={item}
          isMe={item.username === me}
          onPress={() => openUser(item.username)}
          onMore={isMine && kind === 'followers' ? () => more(item) : undefined}
        />
      )}
      onEndReached={() => {
        if (source.hasNextPage && !source.isFetchingNextPage) void source.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<Empty kind={kind} isMine={isMine} filtered={Boolean(needle)} />}
    />
  );
}

/** États vides (specs/social/docs/04 §4.5). */
function Empty({
  kind,
  isMine,
  filtered,
}: {
  kind: ConnectionsKind;
  isMine: boolean;
  filtered: boolean;
}) {
  if (filtered) return <EmptyState icon={UsersThreeIcon} title="Aucun membre ne correspond" />;
  if (!isMine) return <EmptyState icon={UsersThreeIcon} title="Rien ici pour l'instant" />;
  if (kind === 'followers') {
    return (
      <EmptyState
        icon={UsersThreeIcon}
        title="Personne ne te suit encore"
        action={{ label: 'Inviter', onPress: openInviteSheet }}
      />
    );
  }
  return (
    <EmptyState
      icon={UsersThreeIcon}
      title="Tu ne suis personne pour l'instant"
      action={{
        label: 'Trouver des membres',
        onPress: () => router.push({ pathname: '/search', params: { tab: 'members' } }),
      }}
    />
  );
}

/** Lignes de 60 avec un cercle de 44 pendant le chargement. */
function RowsSkeleton() {
  return (
    <View style={styles.list}>
      {[0, 1, 2, 3, 4].map((row) => (
        <View key={row} style={styles.skeletonRow}>
          <SkeletonBox width={44} height={44} radius={22} />
          <View style={styles.skeletonText}>
            <SkeletonBox width={140} height={15} radius={radii.rSm} />
            <SkeletonBox width={90} height={13} radius={radii.rSm} />
          </View>
        </View>
      ))}
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
  filter: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  list: {
    paddingBottom: 40,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingLeft: 16,
  },
  skeletonText: {
    gap: 6,
  },
});
