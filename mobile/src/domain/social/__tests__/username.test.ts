import {
  canSubmitUsername,
  cleanUsername,
  isValidUsername,
  isWellFormedUsername,
  proposeUsername,
  RESERVED_USERNAMES,
  searchQuery,
  usernameStatus,
} from '../username';

describe('searchQuery', () => {
  it('sans « @ », accents, majuscules ni espaces autour', () => {
    expect(searchQuery(' @Léa ')).toBe('lea');
    expect(searchQuery('@')).toBe('');
    expect(searchQuery('Élodie M')).toBe('elodie m');
  });
});

describe('cleanUsername', () => {
  it('passe en minuscules et retire les accents', () => {
    expect(cleanUsername('Éloïse.B')).toBe('eloise.b');
    expect(cleanUsername('Éloïse')).toBe('eloise');
  });

  it('retire les caractères interdits et coupe à 20', () => {
    expect(cleanUsername('Dim K!@#-é_')).toBe('dimke_');
    expect(cleanUsername('a'.repeat(25))).toBe('a'.repeat(20));
  });
});

describe('isValidUsername', () => {
  it('3 à 20 caractères permis', () => {
    expect(isValidUsername('dim.k')).toBe(true);
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('a'.repeat(21))).toBe(false);
    expect(isValidUsername('Dim')).toBe(false);
  });

  it('refuse les pseudos réservés, qui restent bien formés', () => {
    expect(RESERVED_USERNAMES.has('settings')).toBe(true);
    expect(isWellFormedUsername('settings')).toBe(true);
    expect(isValidUsername('settings')).toBe(false);
  });
});

describe('proposeUsername', () => {
  it('prénom + initiale du nom', () => {
    expect(proposeUsername('Dim Kovac')).toBe('dim.k');
    expect(proposeUsername('Éloïse Bouchard-Tremblay')).toBe('eloise.b');
    expect(proposeUsername('  Léa   Marie  Martin ')).toBe('lea.m');
  });

  it('un seul mot : le prénom', () => {
    expect(proposeUsername('Dimitri')).toBe('dimitri');
  });

  it('trop court ou vide : complété', () => {
    expect(proposeUsername('Al')).toBe('al.tv');
    expect(proposeUsername('')).toBe('membre');
    expect(proposeUsername(undefined)).toBe('membre');
    expect(proposeUsername('李 王')).toBe('membre');
  });

  it('toujours au bon format', () => {
    for (const name of ['Jean-Édouard de La Fontaine', "D'Arcy O'Neil", 'X', 'A B']) {
      expect(isWellFormedUsername(proposeUsername(name))).toBe(true);
    }
  });
});

describe('usernameStatus', () => {
  const base = { value: 'dim.k', checked: 'dim.k', loading: false, failed: false };

  it('vérification pendant la frappe et pendant la requête', () => {
    expect(usernameStatus({ ...base, checked: 'dim' })).toBe('checking');
    expect(usernameStatus({ ...base, loading: true })).toBe('checking');
  });

  it('ignore une réponse obtenue pour une autre valeur', () => {
    const stale = { available: true };
    expect(usernameStatus({ ...base, value: 'dim.kk', result: stale })).toBe('checking');
  });

  it('disponible, pris, invalide, hors ligne', () => {
    expect(usernameStatus({ ...base, result: { available: true } })).toBe('available');
    expect(usernameStatus({ ...base, result: { available: false, reason: 'taken' } })).toBe(
      'taken',
    );
    expect(usernameStatus({ ...base, result: { available: false, reason: 'reserved' } })).toBe(
      'taken',
    );
    expect(usernameStatus({ ...base, value: 'di', checked: 'di' })).toBe('invalid');
    expect(usernameStatus({ ...base, failed: true })).toBe('offline');
  });

  it('pseudo actuel : aucune vérification', () => {
    expect(usernameStatus({ ...base, current: 'dim.k', checked: 'other' })).toBe('current');
  });

  it('seuls un pseudo libre ou inchangé permettent de continuer', () => {
    expect(canSubmitUsername('available')).toBe(true);
    expect(canSubmitUsername('current')).toBe(true);
    for (const status of ['checking', 'taken', 'invalid', 'offline'] as const) {
      expect(canSubmitUsername(status)).toBe(false);
    }
  });
});
