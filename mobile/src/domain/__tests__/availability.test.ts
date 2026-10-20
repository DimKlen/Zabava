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
});

describe('countriesLabel', () => {
  it('nomme les pays entre parenthèses', () => {
    expect(countriesLabel(['FR', 'CA'])).toBe('(France, Canada)');
  });

  it('ne dit rien sans pays', () => {
    expect(countriesLabel(undefined)).toBeUndefined();
    expect(countriesLabel([])).toBeUndefined();
  });
});
