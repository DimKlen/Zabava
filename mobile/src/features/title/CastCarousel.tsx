import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CastMember } from '@/api/titles';
import { GradientFill } from '@/components/GradientFill';
import { HorizontalCarousel } from '@/components/HorizontalCarousel';
import { initials } from '@/domain/initials';
import { tmdbImage } from '@/lib/tmdb';
import { colors } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

import { InfoSection } from './InfoSection';

const MAX_CAST = 15;
const PHOTO = 64;

/** Casting : les 15 premiers membres ; tap → fiche personne. */
export function CastCarousel({ cast }: { cast: CastMember[] }) {
  if (cast.length === 0) return null;
  return (
    <InfoSection title="Casting" fullWidth>
      <HorizontalCarousel
        data={cast.slice(0, MAX_CAST)}
        keyExtractor={(member) => String(member.id)}
        gap={12}
        renderItem={(member) => <CastItem member={member} />}
      />
    </InfoSection>
  );
}

function CastItem({ member }: { member: CastMember }) {
  const photo = tmdbImage(member.profilePath, 'w185');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={member.character ? `${member.name}, ${member.character}` : member.name}
      onPress={() => router.push(`/person/${member.id}`)}
      style={styles.item}
    >
      <View style={styles.photo}>
        <GradientFill gradientKey={member.name} />
        {photo ? (
          <Image source={{ uri: photo }} contentFit="cover" style={StyleSheet.absoluteFill} />
        ) : (
          <Text style={styles.initials}>{initials(member.name)}</Text>
        )}
      </View>
      <Text style={styles.name}>{member.name}</Text>
      {member.character ? <Text style={styles.role}>{member.character}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    width: 76,
    alignItems: 'center',
    gap: 6,
  },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 18 * 1.2,
    color: colors.text,
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 12 * 1.2,
    textAlign: 'center',
    color: colors.text,
  },
  role: {
    ...typography.tiny,
    textAlign: 'center',
    color: colors.neutral500,
  },
});
