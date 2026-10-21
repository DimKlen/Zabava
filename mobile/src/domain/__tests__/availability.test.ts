import { countriesLabel, whereToWatch } from '../availability';

const netflix = { id: 8, name: 'Netflix', short: 'N', countries: ['FR'] };
const crave = { id: 230, name: 'Crave', short: 'C' };
const apple = { id: 350, name: 'Apple TV+', short: 'tv' };

describe('whereToWatch', () => {
  it('rassemble abonnement, location et achat sans doublon', () => {
    const result = whereToWatch({ sub: [netflix], rent: [apple, netflix], buy: [crave] }, []);
    expect(result.map((p) => p.id)).toEqual([8, 350, 230]);
  });

  it('met mes plateformes en premier', () => {
    const result = whereToWatch({ sub: [netflix], rent: [apple], buy: [] }, [350]);
    expect(result.map((p) => p.id)).toEqual([350, 8]);
  });

  it('une seule entrée par service, sans formule avec publicités ni CosmoGo', () => {
    const prime = { id: 9, name: 'Amazon Prime Video', short: 'pv' };
    const primeAds = { id: 2100, name: 'Amazon Prime Video with Ads', short: 'pv' };
    const amazonVideo = { id: 10, name: 'Amazon Video', short: 'pv' };
    const netflixAds = { id: 1796, name: 'Netflix Standard with Ads', short: 'N' };
    const cosmo = { id: 5, name: 'CosmoGo', short: 'CG' };
    const result = whereToWatch(
      { sub: [prime, primeAds, cosmo, netflix, netflixAds], rent: [amazonVideo], buy: [] },
      [10],
    );
    expect(result.map((p) => [p.name, p.ids])).toEqual([
      ['Amazon Prime Video', [9, 10]],
      ['Netflix', [8]],
    ]);
  });
});

describe('whereToWatch : pays', () => {
  it('une plateforme en abonnement et en location garde les pays des deux', () => {
    const rentUs = { ...netflix, countries: ['US'] };
    const [first] = whereToWatch({ sub: [netflix], rent: [rentUs], buy: [] }, []);
    expect(first?.countries).toEqual(['FR', 'US']);
  });
});

describe('countriesLabel', () => {
  it('codes des pays entre parenthèses (« Netflix (USA, FRA) »)', () => {
    expect(countriesLabel(['US', 'FR'])).toBe('(USA, FRA)');
    expect(countriesLabel(['CA', 'BE', 'CH'])).toBe('(CAN, BEL, CHE)');
  });

  it('pays sans code connu : son code ISO à deux lettres', () => {
    expect(countriesLabel(['JP'])).toBe('(JP)');
  });

  it('ne dit rien sans pays', () => {
    expect(countriesLabel(undefined)).toBeUndefined();
    expect(countriesLabel([])).toBeUndefined();
  });
});
