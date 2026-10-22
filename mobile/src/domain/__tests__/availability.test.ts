import { countryLabel, whereToWatch } from '../availability';

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

describe('whereToWatch : liste du profil', () => {
  it('écarte les plateformes absentes de « Mes plateformes »', () => {
    const fandango = { id: 7, name: 'Fandango At Home', short: 'F' };
    const result = whereToWatch({ sub: [], rent: [fandango, netflix], buy: [] }, []);
    expect(result.map((p) => p.name)).toEqual(['Netflix']);
  });
});

describe('whereToWatch : pays', () => {
  it('une plateforme en abonnement et en location garde les pays des deux', () => {
    const rentUs = { ...netflix, countries: ['US'] };
    const [first] = whereToWatch({ sub: [netflix], rent: [rentUs], buy: [] }, []);
    expect(first?.countries).toEqual(['FR', 'US']);
  });
});

describe('countryLabel', () => {
  it('disponible dans ma région : aucun pays affiché', () => {
    expect(countryLabel(['BE', 'CA', 'FR', 'US'], 'CA')).toBeUndefined();
  });

  it('sinon, un seul pays : le plus proche de ma région', () => {
    expect(countryLabel(['FR', 'GB', 'US'], 'CA')).toBe('(États-Unis)');
    expect(countryLabel(['BE', 'ES', 'US'], 'FR')).toBe('(Belgique)');
    expect(countryLabel(['DE', 'GB', 'IT'], 'CH')).toBe('(Allemagne)');
    expect(countryLabel(['ES', 'FR', 'GB'], 'US')).toBe('(Royaume-Uni)');
  });

  it('pays sans position connue : après les autres, code ISO', () => {
    expect(countryLabel(['JP', 'FR'], 'CA')).toBe('(France)');
    expect(countryLabel(['JP'], 'CA')).toBe('(JP)');
  });

  it('ne dit rien sans pays ni région', () => {
    expect(countryLabel(undefined, 'CA')).toBeUndefined();
    expect(countryLabel([], 'CA')).toBeUndefined();
    expect(countryLabel(['FR'], undefined)).toBeUndefined();
  });
});
