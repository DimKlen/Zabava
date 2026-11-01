/** Langues de l'app : pure, sans dépendance native. */
export const LANGUAGE_CODES = ['fr', 'en', 'es', 'pt', 'de', 'it', 'ja'] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

/** Réglage : « auto » suit la langue du téléphone. */
export type LanguagePreference = 'auto' | LanguageCode;

/** Chaque langue s'écrit dans sa propre langue, pour la retrouver quelle que soit l'interface. */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  pt: 'Português',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
};

export const FALLBACK_LANGUAGE: LanguageCode = 'en';

/** « fr-CA », « en_US », « pt-BR » → code de l'app ; langue non gérée → undefined. */
export function toLanguageCode(code: string | null | undefined): LanguageCode | undefined {
  const base = code?.toLowerCase().split(/[-_]/)[0];
  return LANGUAGE_CODES.find((language) => language === base);
}

/** Langue effective : le choix, ou celle du téléphone (anglais si elle n'est pas gérée). */
export function resolveLanguage(
  preference: LanguagePreference,
  deviceCode: string | null | undefined,
): LanguageCode {
  if (preference !== 'auto') return preference;
  return toLanguageCode(deviceCode) ?? FALLBACK_LANGUAGE;
}
