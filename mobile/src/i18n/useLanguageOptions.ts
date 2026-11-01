import { LANGUAGE_CODES, LANGUAGE_NAMES, useT, type LanguagePreference } from '.';

/** « Langue du téléphone » puis chaque langue, écrite dans sa propre langue. */
export function useLanguageOptions(): { value: LanguagePreference; label: string }[] {
  const { t } = useT();
  return [
    { value: 'auto', label: t('language.auto') },
    ...LANGUAGE_CODES.map((code) => ({ value: code, label: LANGUAGE_NAMES[code] })),
  ];
}
