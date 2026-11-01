import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SelectField } from '@/components/SelectField';
import { useLanguageOptions } from '@/i18n/useLanguageOptions';
import { useT, type LanguagePreference } from '@/i18n';
import { chooseLanguage } from '@/features/profile/profileActions';

import { OnboardingFooter } from './OnboardingFooter';
import { StepIntro } from './StepIntro';

/** Étape 1 — Langue. */
export function RegionScreen() {
  const { t } = useT();
  const options = useLanguageOptions();
  const [language, setLanguage] = useState<LanguagePreference>('auto');
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    const ok = await chooseLanguage(language);
    setPending(false);
    if (ok) router.push('/onboarding/platforms');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <StepIntro
          title={t('onboarding.language.title')}
          text={t('onboarding.language.text')}
          textMarginBottom={24}
        />
        <View style={styles.fields}>
          <SelectField
            label={t('language.label')}
            value={language}
            options={options}
            onChange={setLanguage}
          />
        </View>
      </ScrollView>
      <OnboardingFooter
        label={t('onboarding.continue')}
        onPress={() => void submit()}
        disabled={pending}
      />
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
