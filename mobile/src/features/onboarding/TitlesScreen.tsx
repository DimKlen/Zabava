import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { usePopularTitles, type PosterTitle } from '@/api/catalog';
import { useUpdateProfile } from '@/api/profile';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { Poster } from '@/components/Poster';
import { PosterGrid } from '@/components/PosterGrid';
import { SkeletonPoster } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import { addedCountLabel } from '@/domain/onboarding';
import type { MediaType } from '@/domain/types';
import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { OnboardingFooter } from './OnboardingFooter';
import { StepIntro } from './StepIntro';
import { useOnboardingTitles } from './useOnboardingTitles';

const TABS = [
  { key: 'movie', label: 'Films' },
  { key: 'tv', label: 'Séries' },
  { key: 'anime', label: 'Animés' },
] as const;

const SKELETONS = Array.from({ length: 9 }, (_, index) => index);

/** Étape 3 — Premiers titres (specs/docs/05 §5.2). Pas de toast. */
export function TitlesScreen() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<MediaType>('movie');
  const popular = usePopularTitles(type);
  const { added, toggle } = useOnboardingTitles();
  const updateProfile = useUpdateProfile();

  const finish = () =>
    updateProfile.mutate(
      { onboardedAt: new Date().toISOString() },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ['watchlist'] });
          router.push('/onboarding/notifications');
        },
      },
    );

  const header = (
    <View>
      <StepIntro
        title="Tes premiers titres"
        text="Touche ce que tu veux voir ou suivre."
        textMarginBottom={8}
      />
      <UnderlineTabs
        tabs={TABS}
        value={type}
        onChange={setType}
        variant="compact"
        style={styles.tabs}
      />
      {showsLoadError(popular) ? <LoadError onRetry={() => void popular.refetch()} /> : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      {popular.data ? (
        <PosterGrid<PosterTitle>
          key={type}
          data={popular.data}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          paddingTop={16}
          paddingBottom={16}
          renderPoster={(item, width) => (
            <Poster
              title={item}
              showAdd
              inList={added.has(item.id)}
              onPress={() => toggle(item)}
              onToggle={() => toggle(item)}
              style={{ width }}
            />
          )}
        />
      ) : (
        <PosterGrid<number>
          data={showsLoadError(popular) ? [] : SKELETONS}
          keyExtractor={(item) => String(item)}
          ListHeaderComponent={header}
          paddingTop={16}
          scrollEnabled={false}
          renderPoster={(_, width) => <SkeletonPoster style={{ width }} />}
        />
      )}
      <OnboardingFooter label="Terminer" onPress={finish} disabled={updateProfile.isPending}>
        <Text accessibilityLiveRegion="polite" style={styles.count}>
          {addedCountLabel(added.size)}
        </Text>
      </OnboardingFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  tabs: {
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  count: {
    ...typography.meta,
    textAlign: 'center',
    color: colors.accent300,
  },
});
