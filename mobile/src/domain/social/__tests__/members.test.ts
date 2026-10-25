import {
  commonLabel,
  firstName,
  followButtonA11y,
  followButtonState,
  formatCount,
  friendsLabel,
  profileAccess,
  showsCommon,
  stateAfterFollow,
} from '../members';

describe('followButtonState', () => {
  it.each([
    ['none', 'Ajouter en ami', 'userPlus', 'primary'],
    ['requested', 'Accepter', 'userPlus', 'primary'],
    ['pending', 'Demande envoyée', 'clock', 'secondary'],
    ['following', 'Amis', 'check', 'secondary'],
  ] as const)('%s → %s', (followState, label, icon, variant) => {
    expect(followButtonState({ followState })).toMatchObject({ label, icon, variant });
  });

  it('libellés d’accessibilité', () => {
    expect(followButtonA11y('add', 'lea.m')).toBe('Ajouter @lea.m en ami');
    expect(followButtonA11y('accept', 'lea.m')).toBe('Accepter la demande de @lea.m');
    expect(followButtonA11y('friends', 'lea.m')).toBe('Ami avec @lea.m, toucher pour le retirer');
    expect(followButtonA11y('requested', 'lea.m')).toBe(
      "Demande envoyée à @lea.m, toucher pour l'annuler",
    );
  });

  it('ajouter en ami : une demande, ou amis tout de suite si sa demande était reçue', () => {
    expect(stateAfterFollow({ followState: 'none' })).toBe('pending');
    expect(stateAfterFollow({ followState: 'requested' })).toBe('following');
  });
});

describe('compteur d’amis', () => {
  it('singulier pour 0 et 1', () => {
    expect(friendsLabel(0)).toBe('ami');
    expect(friendsLabel(1)).toBe('ami');
    expect(friendsLabel(2)).toBe('amis');
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
  it('pas encore amis (même avec une demande dans un sens ou dans l’autre) : verrouillé', () => {
    for (const followState of ['none', 'pending', 'requested'] as const) {
      expect(profileAccess({ isMe: false, followState }).locked).toBe(true);
    }
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
