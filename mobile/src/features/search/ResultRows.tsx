import { Image } from 'expo-image';
import { CaretRightIcon, CheckIcon, PlusIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PersonResult, TitleResult } from '@/api/search';
import { GradientFill } from '@/components/GradientFill';
import { personRowSubtitle, titleRowSubtitle } from '@/domain/search';
import { tmdbImage } from '@/lib/tmdb';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { PersonAvatar } from '../catalog/PersonAvatar';
import { useInList } from '../catalog/useLibraryMembership';

type TitleRowProps = {
  title: TitleResult;
  onPress: () => void;
  onToggle: () => void;
};

/** Ligne de titre : mini-affiche, titre, « année · type », « + » d'ajout rapide. */
export function TitleRow({ title, onPress, onToggle }: TitleRowProps) {
  const inList = useInList(title);
  const poster = tmdbImage(title.posterPath, 'w92');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title.title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.poster}>
        <GradientFill gradientKey={title.id} />
        {poster ? (
          <Image
            source={{ uri: poster }}
            contentFit="cover"
            cachePolicy="memory-disk"
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </View>
      <View style={styles.texts}>
        <Text numberOfLines={2} style={styles.name}>
          {title.title}
        </Text>
        <Text numberOfLines={1} style={styles.sub}>
          {titleRowSubtitle(title.year, title.type)}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${inList ? 'Retirer' : 'Ajouter'} ${title.title}`}
        onPress={onToggle}
        style={styles.addZone}
        testID="row-add"
      >
        <View style={[styles.add, inList ? styles.addOn : styles.addOff]}>
          {inList ? (
            <CheckIcon size={15} color={colors.bg} weight="bold" />
          ) : (
            <PlusIcon size={15} color={colors.text} />
          )}
        </View>
      </Pressable>
    </Pressable>
  );
}

type PersonRowProps = { person: PersonResult; onPress: () => void };

/** Ligne de personne : photo ronde, nom, « Personne · 2 titres connus », chevron. */
export function PersonRow({ person, onPress }: PersonRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={person.name}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <PersonAvatar
        name={person.name}
        profilePath={person.profilePath}
        size={40}
        style={styles.avatar}
      />
      <View style={styles.texts}>
        <Text numberOfLines={1} style={styles.name}>
          {person.name}
        </Text>
        <Text numberOfLines={1} style={styles.sub}>
          {personRowSubtitle(person.knownFor)}
        </Text>
      </View>
      <CaretRightIcon size={16} color={colors.neutral600} style={styles.caret} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 6,
    paddingRight: 8,
    paddingBottom: 6,
    paddingLeft: 16,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  poster: {
    width: 40,
    height: 60,
    borderRadius: radii.rSm,
    overflow: 'hidden',
  },
  avatar: {
    marginVertical: 10,
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: colors.text,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
  addZone: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOff: {
    borderColor: colors.neutral700,
    backgroundColor: colors.transparent,
  },
  addOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  caret: {
    marginRight: 12,
  },
});
