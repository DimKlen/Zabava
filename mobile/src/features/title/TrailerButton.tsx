import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { PlayIcon } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { GradientFill } from '@/components/GradientFill';
import { Text } from '@/components/Text';
import { tmdbImage } from '@/lib/tmdb';
import { colors, radii } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = { titleId: string; trailerKey: string; backdropPath?: string };

/** Origine déclarée à YouTube : sans référent, le lecteur intégré refuse la lecture. */
const ORIGIN = 'https://zabava.app';

/** Page du lecteur : iframe YouTube plein cadre, lancée tout de suite, sans quitter l'app. */
export function trailerHtml(trailerKey: string): string {
  const params = `autoplay=1&playsinline=1&rel=0&modestbranding=1&origin=${encodeURIComponent(ORIGIN)}`;
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailerKey)}?${params}`;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:${colors.bg}}iframe{border:0;width:100%;height:100%}</style></head><body><iframe src="${src}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe></body></html>`;
}

/** Le lecteur reste dans l'app ; un lien vers YouTube (logo, titre) s'ouvre à côté. */
function stayInPlayer(request: WebViewNavigation): boolean {
  const url = request.url;
  if (
    url.startsWith(ORIGIN) ||
    url === 'about:blank' ||
    /youtube(-nocookie)?\.com\/embed\//.test(url)
  ) {
    return true;
  }
  void Linking.openURL(url).catch(() => undefined);
  return false;
}

/** Bande-annonce 16:9 : lue dans la fiche, arrêtée dès qu'on quitte l'écran. */
export function TrailerButton({ titleId, trailerKey, backdropPath }: Props) {
  const backdrop = tmdbImage(backdropPath, 'w780');
  const [playing, setPlaying] = useState(false);

  // Quitter la fiche (retour, autre écran, autre onglet) démonte le lecteur : le son s'arrête.
  useFocusEffect(useCallback(() => () => setPlaying(false), []));

  return (
    <View style={styles.section}>
      {playing ? (
        <View style={styles.frame}>
          <WebView
            testID="trailer-player"
            source={{ html: trailerHtml(trailerKey), baseUrl: ORIGIN }}
            originWhitelist={['*']}
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            onShouldStartLoadWithRequest={stayInPlayer}
            style={styles.player}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lire la bande-annonce"
          onPress={() => setPlaying(true)}
          style={styles.frame}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  frame: {
    aspectRatio: 16 / 9,
    borderRadius: radii.rLg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  player: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.bg,
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
