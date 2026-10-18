/** Liste des plateformes : une seule entrée par service, et recherche par nom. */
import type { Provider } from './types';

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** « Amazon Channel », « Apple TV Channel »… : revente d'un service déjà listé. */
const CHANNEL = /\b(amazon|apple tv|roku premium|youtube primetime)\s+channel\b/;

/**
 * Garde la variante la plus simple : « Paramount Plus Premium » ou « AMC+ Amazon Channel »
 * disparaissent si « Paramount Plus » ou « AMC+ » existe. L'ordre d'origine est conservé.
 */
export function simplifyProviders(providers: readonly Provider[]): Provider[] {
  const names = providers.map((provider) => normalize(provider.name));
  return providers.filter((provider, index) => {
    const name = normalize(provider.name);
    if (CHANNEL.test(name)) {
      const base = name.replace(CHANNEL, '').trim();
      if (base !== '' && names.includes(base)) return false;
    }
    return !names.some((other, otherIndex) => {
      return otherIndex !== index && other.length < name.length && name.startsWith(`${other} `);
    });
  });
}

/** Filtre par nom, sans accents ni casse ; une requête vide garde tout. */
export function searchProviders(providers: readonly Provider[], query: string): Provider[] {
  const needle = normalize(query);
  if (needle === '') return [...providers];
  return providers.filter((provider) => normalize(provider.name).includes(needle));
}
