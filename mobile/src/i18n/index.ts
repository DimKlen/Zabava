import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  LANGUAGE_CODES,
  resolveLanguage,
  type LanguageCode,
  type LanguagePreference,
} from './languages';
import { de } from './locales/de';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr, type MessageKey, type Messages } from './locales/fr';
import { it } from './locales/it';
import { ja } from './locales/ja';
import { pt } from './locales/pt';

export * from './languages';
export type { MessageKey };

const MESSAGES: Record<LanguageCode, Messages> = { fr, en, es, pt, de, it, ja };

type LanguageState = {
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
};

/** Choix de langue, gardé sur l'appareil (« auto » : langue du téléphone, par défaut). */
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      preference: 'auto',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: 'zabava.language',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ preference: s.preference }),
      // Valeur inconnue (ancienne version) : retour à « auto ».
      merge: (persisted, current) => {
        const saved = (persisted as Partial<LanguageState> | undefined)?.preference;
        const valid = saved === 'auto' || LANGUAGE_CODES.some((code) => code === saved);
        return { ...current, preference: valid && saved ? saved : 'auto' };
      },
    },
  ),
);

/** Langue du téléphone (« fr », « en »…). */
function deviceLanguage(): string | null {
  return getLocales()[0]?.languageCode ?? null;
}

export function currentLanguage(): LanguageCode {
  return resolveLanguage(useLanguageStore.getState().preference, deviceLanguage());
}

/** Traduit une clé ; `{nom}` est remplacé par la valeur de `params`. */
export function translate(
  language: LanguageCode,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const text = MESSAGES[language][key] ?? fr[key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  return translate(currentLanguage(), key, params);
}

/** Dans un composant : se met à jour quand le choix de langue change. */
export function useT() {
  const preference = useLanguageStore((s) => s.preference);
  const language = resolveLanguage(preference, deviceLanguage());
  return {
    language,
    t: (key: MessageKey, params?: Record<string, string | number>) =>
      translate(language, key, params),
  };
}
