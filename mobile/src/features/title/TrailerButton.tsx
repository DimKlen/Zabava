import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { PlayIcon } from 'phosphor-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';

import { GradientFill } from '@/components/GradientFill';
import { Text } from '@/components/Text';
import { tmdbImage } from '@/lib/tmdb';
import { useAfterFirstFrame } from '@/lib/useAfterFirstFrame';
import { colors, radii } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = { titleId: string; trailerKey: string; backdropPath?: string };

/** Origine déclarée à YouTube : sans référent, le lecteur intégré refuse la lecture. */
const ORIGIN = 'https://zabava.app';

/** Sans signal du lecteur (réseau lent, lecture auto refusée), le voile s'efface quand même. */
export const TRAILER_LOADING_TIMEOUT_MS = 15_000;

/** Page vide : démarre le moteur WebView avant le tap, sans rien télécharger. */
const BLANK_HTML = `<!doctype html><html><body style="margin:0;background:${colors.bg}"></body></html>`;

/** `idle` : vignette ; `loading` : lecteur qui se charge sous le voile ; `playing` : lecteur visible. */
type Phase = 'idle' | 'loading' | 'playing';

/**
 * Page du lecteur : API IFrame de YouTube, lancée tout de suite. Elle prévient l'app
 * (`playing`) dès que la vidéo joue, pour retirer le voile au bon moment.
 */
export function trailerHtml(trailerKey: string): string {
  // Chaîne JS sûre dans un <script> : guillemets échappés, « < » neutralisé.
  const videoId = JSON.stringify(trailerKey).replace(/</g, '\\u003c');
  const origin = JSON.stringify(ORIGIN);
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;overflow:hidden;background:${colors.bg}}#player{width:100%;height:100%}</style></head>
<body><div id="player"></div><script>
function post(message){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message)}
function onYouTubeIframeAPIReady(){new YT.Player('player',{videoId:${videoId},host:'https://www.youtube-nocookie.com',
playerVars:{autoplay:1,playsinline:1,rel:0,modestbranding:1,origin:${origin}},
events:{onReady:function(e){e.target.playVideo()},onStateChange:function(e){if(e.data===1)post('playing')},onError:function(){post('error')}}})}
var tag=document.createElement('script');tag.src='https://www.youtube.com/iframe_api';tag.onerror=function(){post('error')};document.head.appendChild(tag);
</script></body></html>`;
}

/** Le lecteur reste dans l'app ; un lien vers YouTube (logo, titre) s'ouvre à côté. */
function stayInPlayer(request: WebViewNavigation): boolean {
  const url = request.url;
  if (
    url.startsWith(ORIGIN) ||
    url === 'about:blank' ||
    /youtube(-nocookie)?\.com\/(embed\/|iframe_api|s\/player\/)/.test(url)
  ) {
    return true;
  }
  void Linking.openURL(url).catch(() => undefined);
  return false;
}

/**
 * Bande-annonce 16:9 lue dans la fiche. Le moteur WebView démarre derrière la vignette dès
 * l'affichage de la fiche ; au tap, la même vignette reste en place sous un voile avec un
 * indicateur, pendant que YouTube se charge, et disparaît quand la vidéo joue. Quitter la
 * fiche arrête la lecture et libère le lecteur.
 */
export function TrailerButton({ titleId, trailerKey, backdropPath }: Props) {
  const backdrop = tmdbImage(backdropPath, 'w780');
  const [phase, setPhase] = useState<Phase>('idle');
  const [focused, setFocused] = useState(true);
  const warm = useAfterFirstFrame();

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      // Quitter la fiche (retour, autre écran, autre onglet) : son coupé, lecteur démonté.
      return () => {
        setPhase('idle');
        setFocused(false);
      };
    }, []),
  );

  useEffect(() => {
    if (phase !== 'loading') return;
    const timer = setTimeout(() => setPhase('playing'), TRAILER_LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const onMessage = (event: WebViewMessageEvent) => {
    // Lecture lancée ou erreur YouTube : le lecteur prend la main (ses propres messages).
    if (event.nativeEvent.data === 'playing' || event.nativeEvent.data === 'error') {
      setPhase('playing');
    }
  };

  const active = phase !== 'idle';

  return (
    <View style={styles.section}>
      <View style={styles.frame}>
        {focused && (warm || active) ? (
          // Un seul lecteur, de la page vide au tap jusqu'à la vidéo : il n'est jamais remonté.
          <WebView
            testID={active ? 'trailer-player' : 'trailer-warmup'}
            source={
              active
                ? { html: trailerHtml(trailerKey), baseUrl: ORIGIN }
                : { html: BLANK_HTML, baseUrl: ORIGIN }
            }
            originWhitelist={['*']}
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            androidLayerType="hardware"
            mediaPlaybackRequiresUserAction={false}
            onShouldStartLoadWithRequest={stayInPlayer}
            onMessage={onMessage}
            // Pas de barre de défilement ni de rebond pendant le chargement de la page.
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            overScrollMode="never"
            style={styles.player}
          />
        ) : null}
        {phase !== 'playing' ? (
          // Même vignette avant et pendant le chargement : rien ne clignote au tap.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lire la bande-annonce"
            accessibilityState={{ busy: phase === 'loading' }}
            disabled={phase === 'loading'}
            onPress={() => setPhase('loading')}
            style={styles.cover}
            testID={phase === 'loading' ? 'trailer-loading' : undefined}
          >
            <GradientFill gradientKey={titleId} />
            {backdrop ? (
              <Image
                source={{ uri: backdrop }}
                contentFit="cover"
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            {phase === 'idle' ? (
              <>
                <View style={styles.play}>
                  <PlayIcon size={22} weight="fill" color={colors.accent} />
                </View>
                <Text style={styles.label}>Bande-annonce · YouTube</Text>
              </>
            ) : (
              <>
                <View style={styles.veil} />
                <ActivityIndicator
                  size="large"
                  color={colors.text}
                  accessibilityLabel="Chargement de la bande-annonce"
                />
              </>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const fill = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

const styles = StyleSheet.create({
  section: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  // Ni coins arrondis ni overflow: hidden sur le cadre du lecteur : ce rognage rend la
  // vidéo noire sur Android (le son passe). Seule la vignette posée dessus est arrondie.
  frame: {
    aspectRatio: 16 / 9,
  },
  player: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.bg,
  },
  cover: {
    ...fill,
    borderRadius: radii.rLg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  veil: {
    ...fill,
    backgroundColor: colors.bgA60,
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
