import { CaretRightIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BottomSheet, SheetHandle } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import {
  followingNames,
  followingStatus,
  followingText,
  STACK_MAX,
  type TitleHolder,
} from '@/domain/social/followingSummary';
import type { MediaType } from '@/domain/types';
import { colors, durations, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { InfoSection } from '../title/InfoSection';
import { openUser } from './navigation';

const STACK_AVATAR = 32;
const STACK_BORDER = 2;
const STACK_OVERLAP = -10;

type Props = { holders: TitleHolder[]; type: MediaType; title: string };

/** « Tes abonnements » d'une fiche, puis la sheet de leurs statuts (specs/social/docs/03). */
export function FollowingCard({ holders, type, title }: Props) {
  const [open, setOpen] = useState(false);
  const text = followingText(followingNames(holders));
  return (
    <InfoSection title="Tes abonnements">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Tes abonnements : ${text}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.stack}>
          {holders.slice(0, STACK_MAX).map(({ user }) => (
            <View key={user.username} style={styles.stacked}>
              <Avatar size={STACK_AVATAR} name={user.displayName} uri={user.avatarUrl} />
            </View>
          ))}
        </View>
        <Text style={styles.text}>{text}</Text>
        <CaretRightIcon size={16} color={colors.neutral600} />
      </Pressable>
      <FollowingSheet
        visible={open}
        onClose={() => setOpen(false)}
        holders={holders}
        type={type}
        title={title}
      />
    </InfoSection>
  );
}

function FollowingSheet({
  visible,
  onClose,
  holders,
  type,
  title,
}: Props & { visible: boolean; onClose: () => void }) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      enterDuration={durations.sheetPlatforms}
      panelStyle={styles.panel}
    >
      <SheetHandle />
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.sheetTitle}>
          Tes abonnements
        </Text>
        <Text style={styles.sheetSubtitle}>{title}</Text>
      </View>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {holders.map((holder) => (
          <Pressable
            key={holder.user.username}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              openUser(holder.user.username);
            }}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Avatar size={40} name={holder.user.displayName} uri={holder.user.avatarUrl} />
            <View style={styles.rowText}>
              <Text numberOfLines={1} style={styles.name}>
                {holder.user.displayName}
              </Text>
              <Text style={styles.status}>{followingStatus(holder, type)}</Text>
            </View>
            <CaretRightIcon size={16} color={colors.neutral600} />
          </Pressable>
        ))}
      </ScrollView>
      <Button
        variant="secondary"
        height={46}
        label="Fermer"
        onPress={onClose}
        style={styles.close}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingTop: 8,
    paddingRight: 12,
    paddingBottom: 8,
    paddingLeft: 22,
    borderRadius: radii.rLg,
    backgroundColor: colors.surface,
  },
  pressed: {
    backgroundColor: colors.neutral800,
  },
  stack: {
    flexDirection: 'row',
  },
  stacked: {
    marginLeft: STACK_OVERLAP,
    borderWidth: STACK_BORDER,
    borderColor: colors.surface,
    borderRadius: (STACK_AVATAR + STACK_BORDER * 2) / 2,
  },
  text: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    color: colors.neutral300,
  },
  panel: {
    maxHeight: '75%',
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 34,
  },
  header: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  sheetTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 18 * 1.3,
    color: colors.text,
  },
  sheetSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.rMd,
  },
  rowPressed: {
    backgroundColor: colors.neutral800,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: colors.text,
  },
  status: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
  close: {
    marginTop: 8,
    marginHorizontal: 4,
  },
});
