import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useUpdateProfile } from '@/api/profile';
import { SelectField } from '@/components/SelectField';
import { DEFAULT_LANGUAGE, LANGUAGES, type LanguageCode } from '@/domain/onboarding';

import { OnboardingFooter } from './OnboardingFooter';
import { StepIntro } from './StepIntro';

/** Étape 1 — Langue. */
export function RegionScreen() {
  const updateProfile = useUpdateProfile();
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  const submit = () =>
    updateProfile.mutate({ language }, { onSuccess: () => router.push('/onboarding/platforms') });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <StepIntro
          title="Dans quelle langue ?"
          text="Choisis la langue des titres et des descriptions."
          textMarginBottom={24}
        />
        <View style={styles.fields}>
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
