import { LANGUAGE_CODES, LANGUAGE_NAMES, resolveLanguage, toLanguageCode, translate } from '..';
import { de } from '../locales/de';
import { en } from '../locales/en';
import { es } from '../locales/es';
import { fr } from '../locales/fr';
import { it as itLocale } from '../locales/it';
import { ja } from '../locales/ja';
import { pt } from '../locales/pt';

describe('langues', () => {
  it('7 langues, chacune écrite dans sa langue', () => {
    expect(LANGUAGE_CODES).toEqual(['fr', 'en', 'es', 'pt', 'de', 'it', 'ja']);
    expect(Object.values(LANGUAGE_NAMES)).toEqual([
      'Français',
      'English',
      'Español',
      'Português',
      'Deutsch',
      'Italiano',
      '日本語',
    ]);
  });

  it('un code régional se lit comme sa langue', () => {
    expect(toLanguageCode('fr-CA')).toBe('fr');
    expect(toLanguageCode('en_US')).toBe('en');
    expect(toLanguageCode('pt-BR')).toBe('pt');
    expect(toLanguageCode('zh')).toBeUndefined();
    expect(toLanguageCode(null)).toBeUndefined();
  });
});

describe('resolveLanguage', () => {
  it('« auto » suit le téléphone', () => {
    expect(resolveLanguage('auto', 'ja')).toBe('ja');
    expect(resolveLanguage('auto', 'de-DE')).toBe('de');
  });

  it('« auto » avec une langue non gérée : anglais', () => {
    expect(resolveLanguage('auto', 'zh')).toBe('en');
    expect(resolveLanguage('auto', null)).toBe('en');
  });

  it('un choix explicite remplace le téléphone', () => {
    expect(resolveLanguage('fr', 'en')).toBe('fr');
  });
});

describe('traductions', () => {
  it.each([
    ['en', en],
    ['es', es],
    ['pt', pt],
    ['de', de],
    ['it', itLocale],
    ['ja', ja],
  ])('%s a les mêmes clés que le français, sans texte vide', (_code, messages) => {
    expect(Object.keys(messages).sort()).toEqual(Object.keys(fr).sort());
    expect(Object.values(messages).every((text) => text.length > 0)).toBe(true);
  });

  it('chaque traduction garde les variables du texte français', () => {
    for (const messages of [en, es, pt, de, itLocale, ja]) {
      expect(messages['settings.version']).toContain('{version}');
    }
  });

  it('remplace les variables', () => {
    expect(translate('en', 'settings.version', { version: '1.2' })).toBe('Version 1.2');
    expect(translate('fr', 'tabs.upcoming')).toBe('À venir');
  });
});

describe('variables des traductions', () => {
  it('chaque langue garde les variables {nom} du français', () => {
    const vars = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const messages of [en, es, pt, de, itLocale, ja]) {
      for (const key of Object.keys(fr) as (keyof typeof fr)[]) {
        expect({ key, vars: vars(messages[key]) }).toEqual({ key, vars: vars(fr[key]) });
      }
    }
  });
});
