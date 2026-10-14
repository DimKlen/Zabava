import { Image } from 'expo-image';
import { PlayIcon } from 'phosphor-react-native';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { GradientFill } from '@/components/GradientFill';
import { Text } from '@/components/Text';
import { tmdbImage } from '@/lib/tmdb';
import { showToast } from '@/store/ui';
import { colors, radii } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = { titleId: string; trailerKey: string; backdropPath?: string };

/** Bande-annonce 16:9 : ouvre YouTube (pas de lecture dans l'app). */
export function TrailerButton({ titleId, trailerKey, backdropPath }: Props) {
  const backdrop = tmdbImage(backdropPath, 'w780');

  const open = () => {
    void Linking.openURL(`https://www.youtube.com/watch?v=${trailerKey}`).catch(() => undefined);
    showToast('Ouverture de YouTube…');
  };

  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Bande-annonce sur YouTube"
        onPress={open}
        style={styles.button}
      >
        <GradientFill gradientKey={titleId} />
        {backdrop ? (
          <Image source={{ uri: backdrop }} contentFit="cover" style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={styles.play}>
          <PlayIcon size={22} weight="fill" color={colors.accent} />
        </View>
        <Text style={styles.label}>Bande-annonce · YouTube</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  button: {
    aspectRatio: 16 / 9,
    borderRadius: radii.rLg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.bgA60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.meta,
    position: 'absolute',
    left: 12,
    bottom: 10,
    color: colors.text,
  },
});
