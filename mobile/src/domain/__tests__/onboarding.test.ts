import {
  addedCountLabel,
  LANGUAGES,
  defaultRegion,
  languageChoice,
  languageLabel,
  initialStatus,
  nextStep,
  previousStep,
  stepFromPath,
} from '../onboarding';

describe('defaultRegion', () => {
  it('reprend la région du téléphone si elle est proposée', () => {
    expect(defaultRegion('FR')).toBe('FR');
    expect(defaultRegion('ch')).toBe('CH');
  });

  it('se rabat sur le Canada sinon', () => {
    expect(defaultRegion('DE')).toBe('CA');
    expect(defaultRegion(null)).toBe('CA');
    expect(defaultRegion(undefined)).toBe('CA');
  });
});

describe('étapes', () => {
  it('« Passer » mène à l’étape suivante, puis aux notifications', () => {
    expect(nextStep('region')).toBe('platforms');
    expect(nextStep('platforms')).toBe('titles');
    expect(nextStep('titles')).toBe('notifications');
  });

  it('le retour n’existe qu’aux étapes 2 et 3', () => {
    expect(previousStep('region')).toBeNull();
    expect(previousStep('platforms')).toBe('region');
    expect(previousStep('titles')).toBe('platforms');
  });

  it('déduit l’étape du chemin', () => {
    expect(stepFromPath('/onboarding/region')).toBe('region');
    expect(stepFromPath('/onboarding/titles')).toBe('titles');
    expect(stepFromPath('/onboarding/notifications')).toBeNull();
  });
});

describe('addedCountLabel', () => {
  it.each([
    [0, "Touche une affiche pour l'ajouter"],
    [1, '1 titre ajouté'],
    [2, '2 titres ajoutés'],
    [12, '12 titres ajoutés'],
  ])('%i → %s', (count, label) => {
    expect(addedCountLabel(count)).toBe(label);
  });
});

describe('initialStatus', () => {
  it('ajoute un film à « À voir » et suit une série ou un animé', () => {
    expect(initialStatus('movie')).toBe('towatch');
    expect(initialStatus('tv')).toBe('following');
    expect(initialStatus('anime')).toBe('following');
  });
});

describe('langues', () => {
  it('seulement Français et Anglais', () => {
    expect(LANGUAGES.map((language) => language.label)).toEqual(['Français', 'Anglais']);
  });

  it('un ancien code se lit comme sa langue', () => {
    expect(languageLabel('fr-FR')).toBe('Français');
    expect(languageLabel('en-CA')).toBe('Anglais');
    expect(languageChoice('fr-FR')).toBe('fr-CA');
    expect(languageChoice('en-CA')).toBe('en-US');
  });
});
