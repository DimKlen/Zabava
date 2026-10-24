import { seriesCrew } from '../seriesDetail';

describe('seriesCrew › studios', () => {
  it('ajoute une ligne « Studio » cliquable quand des studios sont fournis', () => {
    const studios = [{ id: 7, name: 'MAPPA' }];
    expect(seriesCrew([], ['Tokyo MX'], [], studios)).toEqual([
      { key: 'Studio', value: 'MAPPA', studios },
      { key: 'Diffusion', value: 'Tokyo MX' },
    ]);
  });

  it('au plus 3 studios, dans l’ordre de TMDB', () => {
    const studios = [1, 2, 3, 4, 5].map((id) => ({ id, name: `Studio ${id}` }));
    const [row] = seriesCrew([], [], [], studios);
    expect(row?.studios?.map((s) => s.id)).toEqual([1, 2, 3]);
    expect(row?.value).toBe('Studio 1, Studio 2, Studio 3');
  });

  it('sans studio, aucune ligne « Studio »', () => {
    expect(seriesCrew([], ['Tokyo MX']).map((row) => row.key)).toEqual(['Diffusion']);
  });
});
