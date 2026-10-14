import { DIGEST_HOURS, accountLine, digestLabel, platformsSummary } from '../profile';

const providers = [
  { id: 8, name: 'Netflix', short: 'N' },
  { id: 230, name: 'Crave', short: 'C' },
  { id: 119, name: 'Prime Video', short: 'pv' },
];

describe('profil', () => {
  it('ligne du compte', () => {
    expect(accountLine('dim@exemple.ca', 'apple')).toBe('dim@exemple.ca · Apple');
    expect(accountLine('dim@exemple.ca', 'google')).toBe('dim@exemple.ca · Google');
    expect(accountLine('dim@exemple.ca', 'email')).toBe('dim@exemple.ca');
  });

  it('mes plateformes : ordre de la région, « Aucune » si vide', () => {
    expect(platformsSummary(providers, [119, 8])).toBe('Netflix, Prime Video');
    expect(platformsSummary(providers, [])).toBe('Aucune');
    expect(platformsSummary(providers, [999])).toBe('Aucune');
  });

  it('heures du récapitulatif', () => {
    expect(DIGEST_HOURS.map((h) => h.label)).toEqual(['8 h', '9 h', '12 h', '18 h', '20 h']);
    expect(digestLabel(9)).toBe('9 h');
  });
});
