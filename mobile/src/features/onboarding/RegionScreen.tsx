import { useQueryClient } from '@tanstack/react-query';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useUpdateProfile } from '@/api/profile';
import { SelectField } from '@/components/SelectField';
import {
  DEFAULT_LANGUAGE,
  defaultRegion,
  LANGUAGES,
  REGIONS,
  type LanguageCode,
  type RegionCode,
} from '@/domain/onboarding';

import { OnboardingFooter } from './OnboardingFooter';
import { StepIntro } from './StepIntro';

/** Étape 1 — Région et langue (specs/docs/05 §5.2). */
export function RegionScreen() {
  const queryClient = useQueryClient();
  const updateProfile = useUpdateProfile();
  const [region, setRegion] = useState<RegionCode>(() =>
    defaultRegion(Localization.getLocales()[0]?.regionCode),
  );
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  const submit = () =>
    updateProfile.mutate(
      { region, language },
      {
        onSuccess: () => {
          // Les plateformes proposées dépendent de la région.
          void queryClient.invalidateQueries({ queryKey: ['providers'] });
          router.push('/onboarding/platforms');
        },
      },
    );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <StepIntro
          title="Où regardes-tu ?"
          text="Ta région détermine les plateformes et les dates de sortie affichées. On l'a pré-remplie depuis ton téléphone."
          textMarginBottom={24}
        />
        <View style={styles.fields}>
          <SelectField label="Région" value={region} options={REGIONS} onChange={setRegion} />
          <SelectField label="Langue" value={language} options={LANGUAGES} onChange={setLanguage} />
        </View>
      </ScrollView>
      <OnboardingFooter label="Continuer" onPress={submit} disabled={updateProfile.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  fields: {
    gap: 16,
  },
});
