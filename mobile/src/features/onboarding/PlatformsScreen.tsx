import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useRegionProviders } from '@/api/catalog';
import { useProfile, useSetProviders } from '@/api/profile';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { SkeletonBox } from '@/components/Skeleton';
import { isGroupSelected, toggleGroup, topProviders, type ProviderGroup } from '@/domain/providers';
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

/** Étape 2 — Mes plateformes (specs/docs/05 §5.2). */
export function PlatformsScreen() {
  const { width } = useWindowDimensions();
  const tileWidth = (width - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const profile = useProfile();
  const providers = useRegionProviders(profile.data?.region);
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
              ? topProviders(providers.data, selected).map((provider) => (
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
