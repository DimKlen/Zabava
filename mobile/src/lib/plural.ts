import { currentLanguage, t, type LanguageCode, type MessageKey } from '@/i18n';

/** Catégorie de pluriel d'un nombre : `one` ou `other` (français et portugais : 0 et 1 sont au singulier). */
export function pluralCategory(language: LanguageCode, count: number): 'one' | 'other' {
  switch (language) {
    case 'ja':
      return 'other';
    case 'fr':
    case 'pt':
      return count >= 0 && count < 2 ? 'one' : 'other';
    default:
      return count === 1 ? 'one' : 'other';
  }
}

/** Traduit `<base>.one` ou `<base>.other` selon `count` ; `{count}` est fourni en plus de `params`. */
export function tPlural(
  base: string,
  count: number,
  params: Record<string, string | number> = {},
): string {
  const key = `${base}.${pluralCategory(currentLanguage(), count)}` as MessageKey;
  return t(key, { count: count.toLocaleString(currentLanguage()), ...params });
}
