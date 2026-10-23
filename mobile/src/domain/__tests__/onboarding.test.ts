import {
  addedCountLabel,
  canSkip,
  anyNotificationEnabled,
  LANGUAGES,
  languageChoice,
  languageLabel,
  NOTIFICATIONS_OFF,
  initialStatus,
  nextStep,
  ONBOARDING_STEPS,
  previousStep,
  stepFromPath,
} from '../onboarding';

describe('étapes', () => {
  it('« Passer » mène à l’étape suivante, puis aux notifications', () => {
    expect(nextStep('username')).toBe('region');
    expect(nextStep('region')).toBe('platforms');
    expect(nextStep('platforms')).toBe('titles');
    expect(nextStep('titles')).toBe('notifications');
  });

  it('pas de retour depuis le pseudo, la 1re étape', () => {
    expect(ONBOARDING_STEPS).toEqual(['username', 'region', 'platforms', 'titles']);
    expect(previousStep('username')).toBeNull();
    expect(previousStep('region')).toBe('username');
    expect(previousStep('platforms')).toBe('region');
    expect(previousStep('titles')).toBe('platforms');
  });

  it('« Passer » n’existe pas sur l’étape du pseudo', () => {
    expect(canSkip('username')).toBe(false);
    expect(canSkip('region')).toBe(true);
  });

  it('déduit l’étape du chemin', () => {
    expect(stepFromPath('/onboarding/username')).toBe('username');
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

describe('anyNotificationEnabled', () => {
  it('vrai dès qu’une notification est activée', () => {
    expect(
      anyNotificationEnabled({ episodes: false, cinema: true, streaming: false, seasons: false }),
    ).toBe(true);
  });

  it('faux si tout est coupé ou si le profil est absent', () => {
    expect(anyNotificationEnabled(NOTIFICATIONS_OFF)).toBe(false);
    expect(anyNotificationEnabled(undefined)).toBe(false);
  });
});
