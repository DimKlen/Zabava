import {
  commonLabel,
  firstName,
  followButtonA11y,
  followButtonState,
  formatCount,
  friendsLabel,
  profileAccess,
  showsCommon,
} from '../members';

describe('followButtonState', () => {
  it.each([
    ['none', 'Suivre', 'userPlus', 'primary'],
    ['following', 'Suivi', 'check', 'secondary'],
  ] as const)('%s → %s', (followState, label, icon, variant) => {
    expect(followButtonState({ followState })).toMatchObject({ label, icon, variant });
  });

  it('libellés d’accessibilité', () => {
    expect(followButtonA11y('follow', 'lea.m')).toBe('Suivre @lea.m');
    expect(followButtonA11y('following', 'lea.m')).toBe(
      'Tu suis @lea.m, toucher pour ne plus suivre',
    );
  });
});

describe('compteur d’abonnements', () => {
  it('singulier pour 0 et 1', () => {
    expect(friendsLabel(0)).toBe('abonnement');
    expect(friendsLabel(1)).toBe('abonnement');
    expect(friendsLabel(2)).toBe('abonnements');
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
  it('je ne le suis pas : verrouillé, dès que je le suis : visible', () => {
    expect(profileAccess({ isMe: false, followState: 'none' }).locked).toBe(true);
    expect(profileAccess({ isMe: false, followState: 'following' }).locked).toBe(false);
  });

  it('moi : tout est visible', () => {
    expect(profileAccess({ isMe: true, followState: 'none' })).toEqual({
      isMe: true,
      locked: false,
    });
  });
});

it('prénom = premier mot du nom', () => {
  expect(firstName('Léa Martin')).toBe('Léa');
  expect(firstName('  Max ')).toBe('Max');
});
