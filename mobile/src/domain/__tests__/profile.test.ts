import { DIGEST_HOURS, accountLine, digestLabel, platformsSummary } from '../profile';

const providers = [
  { id: 8, name: 'Netflix', short: 'N', ids: [8] },
  { id: 230, name: 'Crave', short: 'C', ids: [230] },
  { id: 119, name: 'Prime Video', short: 'pv', ids: [119, 2100] },
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
    // Une seule formule cochée suffit (Prime Video avec pubs).
    expect(platformsSummary(providers, [2100])).toBe('Prime Video');
  });

  it('heures du récapitulatif', () => {
    expect(DIGEST_HOURS.map((h) => h.label)).toEqual(['8 h', '9 h', '12 h', '18 h', '20 h']);
    expect(digestLabel(9)).toBe('9 h');
  });
});
