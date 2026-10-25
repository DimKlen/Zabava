import { CaretLeftIcon, UserCirclePlusIcon } from 'phosphor-react-native';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flatItems, useFollowRequests } from '@/api/social';
import { acceptAllRequests, acceptRequest, declineRequest } from '@/api/socialActions';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SkeletonMemberRow } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import type { Member } from '@/domain/social/members';
import { goBack } from '@/lib/navigation';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { openUser } from './navigation';

const SKELETONS = 3;

/** Demandes d'ami reçues (specs/social/docs/04 §4.12), plus récentes d'abord. */
export function FollowRequestsScreen() {
  const insets = useSafeAreaInsets();
  const requests = useFollowRequests();
  const members = flatItems(requests.data?.pages);

  let body;
  if (!requests.data) {
    body = showsLoadError(requests) ? (
      <LoadError onRetry={() => void requests.refetch()} />
    ) : (
      <View style={styles.skeletons}>
        {Array.from({ length: SKELETONS }, (_, i) => (
          <SkeletonMemberRow key={i} />
        ))}
      </View>
    );
  } else {
    body = (
      <FlatList
        data={members}
        keyExtractor={(member) => member.username}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          members.length >= 2 ? (
            <View style={styles.all}>
              <Text style={styles.count}>{members.length} demandes</Text>
              <Button
                variant="ghost"
                height={36}
                label="Tout accepter"
                onPress={() => acceptAllRequests(members)}
                style={styles.allButton}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState icon={UserCirclePlusIcon} title="Aucune demande" paddingTop={48} />
        }
        renderItem={({ item }) => <RequestRow member={item} />}
        onEndReached={() => {
          if (requests.hasNextPage && !requests.isFetchingNextPage) void requests.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
      />
    );
  }

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
          Demandes d&apos;amis
        </Text>
      </View>
      {body}
    </View>
  );
}

function RequestRow({ member }: { member: Member }) {
  const open = () => openUser(member.username);
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={member.displayName} onPress={open}>
        <Avatar size={44} name={member.displayName} uri={member.avatarUrl} />
      </Pressable>
      <Pressable accessibilityRole="button" onPress={open} style={styles.who}>
        <Text numberOfLines={1} style={styles.name}>
          {member.displayName}
        </Text>
        <Text numberOfLines={1} style={styles.handle}>
          @{member.username}
        </Text>
      </Pressable>
      <Button
        variant="primary"
        height={32}
        fontSize={13}
        label="Accepter"
        accessibilityLabel={`Accepter @${member.username}`}
        onPress={() => acceptRequest(member)}
        style={styles.compact}
      />
      <Button
        variant="secondary"
        height={32}
        fontSize={13}
        label="Refuser"
        accessibilityLabel={`Refuser @${member.username}`}
        onPress={() => declineRequest(member)}
        style={styles.compact}
      />
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
  content: {
    paddingBottom: 40,
  },
  skeletons: {
    paddingVertical: 6,
  },
  all: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingRight: 8,
    paddingBottom: 4,
    paddingLeft: 16,
  },
  count: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
  allButton: {
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  who: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: colors.text,
  },
  handle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
  compact: {
    paddingHorizontal: 12,
  },
});
