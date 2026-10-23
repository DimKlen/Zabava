import {
  commonLabel,
  counterLabel,
  firstName,
  followButtonA11y,
  followButtonState,
  formatCount,
  profileAccess,
  showsCommon,
  stateAfterFollow,
} from '../members';

describe('followButtonState', () => {
  it.each([
    ['none', false, 'Suivre', 'userPlus', 'primary'],
    ['none', true, 'Suivre en retour', 'userPlus', 'primary'],
    ['pending', true, 'Demandé', 'clock', 'secondary'],
    ['following', true, 'Abonné', 'check', 'secondary'],
    ['blocked', true, 'Débloquer', 'prohibit', 'secondary'],
  ] as const)('%s (me suit : %s) → %s', (followState, followsMe, label, icon, variant) => {
    expect(followButtonState({ followState, followsMe })).toMatchObject({ label, icon, variant });
  });

  it('libellés d’accessibilité', () => {
    expect(followButtonA11y('follow', 'lea.m')).toBe('Suivre @lea.m');
    expect(followButtonA11y('following', 'lea.m')).toBe(
      'Abonné à @lea.m, toucher pour se désabonner',
    );
  });

  it('suivre un profil privé envoie une demande', () => {
    expect(stateAfterFollow({ isPrivate: true })).toBe('pending');
    expect(stateAfterFollow({ isPrivate: false })).toBe('following');
  });
});

describe('compteurs', () => {
  it('singulier pour 0 et 1', () => {
    expect(counterLabel(0, 'followers')).toBe('abonné');
    expect(counterLabel(1, 'following')).toBe('abonnement');
    expect(counterLabel(2, 'followers')).toBe('abonnés');
    expect(counterLabel(64, 'following')).toBe('abonnements');
  });

  it('abrège à partir de 10 000', () => {
    expect(formatCount(9999)).toBe('9999');
    expect(formatCount(12_400)).toBe('12,4 k');
    expect(formatCount(10_000)).toBe('10 k');
    expect(formatCount(12_499)).toBe('12,4 k');
  });
});

describe('titres en commun', () => {
  it('libellés', () => {
    expect(commonLabel(0)).toBe('Aucun titre en commun');
    expect(commonLabel(1)).toBe('1 titre en commun');
    expect(commonLabel(12)).toBe('12 titres en commun');
  });

  it('affichés à partir de 3', () => {
    expect(showsCommon(2)).toBe(false);
    expect(showsCommon(3)).toBe(true);
  });
});

describe('profileAccess', () => {
  it('privé non suivi (ou demande envoyée) : verrouillé', () => {
    for (const followState of ['none', 'pending'] as const) {
      expect(profileAccess({ isMe: false, isPrivate: true, followState }).locked).toBe(true);
    }
    expect(profileAccess({ isMe: false, isPrivate: true, followState: 'following' }).locked).toBe(
      false,
    );
  });

  it('bloqué par moi : jamais « verrouillé », mais bloqué', () => {
    expect(profileAccess({ isMe: false, isPrivate: true, followState: 'blocked' })).toEqual({
      isMe: false,
      blocked: true,
      locked: false,
    });
  });

  it('moi : tout est visible', () => {
    expect(profileAccess({ isMe: true, isPrivate: true, followState: 'none' })).toEqual({
      isMe: true,
      blocked: false,
      locked: false,
    });
  });
});

it('prénom = premier mot du nom', () => {
  expect(firstName('Léa Martin')).toBe('Léa');
  expect(firstName('  Max ')).toBe('Max');
});
