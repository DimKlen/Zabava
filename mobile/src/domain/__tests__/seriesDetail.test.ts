import { seriesCrew } from '../seriesDetail';

describe('seriesCrew › studios', () => {
  it('ajoute une ligne « Studio » cliquable quand des studios sont fournis', () => {
    const studios = [{ id: 7, name: 'MAPPA' }];
    expect(seriesCrew([], ['Tokyo MX'], [], studios)).toEqual([
      { key: 'Studio', value: 'MAPPA', studios },
      { key: 'Diffusion', value: 'Tokyo MX' },
    ]);
  });

  it('sans studio, aucune ligne « Studio »', () => {
    expect(seriesCrew([], ['Tokyo MX']).map((row) => row.key)).toEqual(['Diffusion']);
  });
});
