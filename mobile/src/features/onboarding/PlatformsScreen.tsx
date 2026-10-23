import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useProviders } from '@/api/catalog';
import { useProfile, useSetProviders } from '@/api/profile';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { SkeletonBox } from '@/components/Skeleton';
import {
  featuredProviders,
  isGroupSelected,
  toggleGroup,
  type ProviderGroup,
} from '@/domain/providers';
import { radii } from '@/theme/tokens';

import { OnboardingFooter } from './OnboardingFooter';
import { PlatformTile } from './PlatformTile';
import { StepIntro } from './StepIntro';

const COLUMNS = 3;
const GAP = 10;
const PADDING = 16;
const SKELETON_COUNT = 6;
/** Hauteur d'une tuile pendant le chargement : 16 + logo 44 + 8 + nom 16 + 12. */
const TILE_HEIGHT = 96;

/**
 * Largeur d'une tuile pour 3 colonnes, arrondie à l'entier inférieur : une largeur fractionnaire
 * (113,57 pt sur un écran de 392,7 pt) déborde à l'arrondi et la 3e tuile passe à la ligne.
 */
export function platformTileWidth(screenWidth: number): number {
  return Math.floor((screenWidth - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
}

/** Étape 2 — Mes plateformes (specs/docs/05 §5.2). */
export function PlatformsScreen() {
  const { width } = useWindowDimensions();
  const tileWidth = platformTileWidth(width);
  const profile = useProfile();
  const providers = useProviders();
  const setProviders = useSetProviders();
  // Aucune présélection pour un nouveau compte ; un retour arrière garde les choix.
  const [selected, setSelected] = useState<readonly number[]>(
    () => profile.data?.providerIds ?? [],
  );

  const toggle = (group: ProviderGroup) => setSelected((current) => toggleGroup(current, group));

  const submit = () =>
    setProviders.mutate([...selected], {
      onSuccess: () => router.push('/onboarding/titles'),
    });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <StepIntro
          title="Tes plateformes"
          text="On les met en avant et on te prévient quand un film de ta liste y arrive."
          textMarginBottom={24}
        />
        {showsLoadError(providers) ? (
          <LoadError onRetry={() => void providers.refetch()} />
        ) : (
          <View style={styles.grid}>
            {providers.data
              ? featuredProviders(providers.data, selected).map((provider) => (
                  <PlatformTile
                    key={provider.id}
                    provider={provider}
                    width={tileWidth}
                    selected={isGroupSelected(provider, selected)}
                    onToggle={() => toggle(provider)}
                  />
                ))
              : Array.from({ length: SKELETON_COUNT }, (_, index) => (
                  <SkeletonBox
                    key={index}
                    width={tileWidth}
                    height={TILE_HEIGHT}
                    radius={radii.rLg}
                  />
                ))}
          </View>
        )}
      </ScrollView>
      <OnboardingFooter label="Continuer" onPress={submit} disabled={setProviders.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: PADDING,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
});
