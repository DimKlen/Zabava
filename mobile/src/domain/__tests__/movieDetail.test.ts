import { movieCrew, movieInfos, movieMeta, movieStatus } from '../movieDetail';

const TODAY = new Date(2026, 9, 10, 12, 0);
const none = { sub: [], rent: [], buy: [] };
const crave = { id: 230, name: 'Crave', short: 'C' };

describe('movieMeta', () => {
  it('assemble année, durée et classification', () => {
    expect(movieMeta({ year: 2024, runtime: 166, certification: '13+' })).toBe(
      '2024 · 2 h 46 · 13+',
    );
  });

  it('omet les valeurs absentes', () => {
    expect(movieMeta({ year: 2026, certification: '13+' })).toBe('2026 · 13+');
    expect(movieMeta({})).toBe('');
  });
});

describe('movieStatus (bandeau de la fiche)', () => {
  it('à venir', () => {
    expect(movieStatus({ releaseTheatrical: '2026-12-18', availability: none }, TODAY).text).toBe(
      'En salle le 18 déc.',
    );
  });

  it('au cinéma', () => {
    expect(movieStatus({ releaseTheatrical: '2026-09-20', availability: none }, TODAY).text).toBe(
      'Au cinéma maintenant',
    );
  });

  it('disponible, avec date numérique connue', () => {
    expect(
      movieStatus(
        {
          releaseTheatrical: '2025-06-01',
          releaseDigital: '2026-09-25',
          availability: { ...none, sub: [crave] },
        },
        TODAY,
      ),
    ).toEqual({
      state: 'avail',
      digital: true,
      text: 'Disponible en numérique depuis le 25 sept.',
    });
  });

  it('disponible sans date', () => {
    expect(
      movieStatus(
        { releaseTheatrical: '2025-06-01', availability: { ...none, sub: [crave] } },
        TODAY,
      ).text,
    ).toBe('Disponible en streaming');
  });

  it('inconnu', () => {
    expect(movieStatus({ releaseTheatrical: '2025-06-01', availability: none }, TODAY).text).toBe(
      'Pas encore de date',
    );
  });
});

describe('Équipe et Infos', () => {
  it('masque les lignes vides', () => {
    expect(movieCrew(['Denis Villeneuve'], [])).toEqual([
      { key: 'Réalisation', value: 'Denis Villeneuve' },
    ]);
  });

  it('rend les réalisateurs cliquables quand les identifiants sont connus', () => {
    expect(movieCrew(['A', 'B'], [], [1, 2])[0]?.people).toEqual([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ]);
    expect(movieCrew(['A', 'B'], [], [1])[0]?.people).toBeUndefined();
  });

  it('affiche la sortie avec la région', () => {
    expect(
      movieInfos(
        { originalTitle: 'Dune: Part Two', releaseTheatrical: '2024-03-01', country: 'États-Unis' },
        'Canada',
      ),
    ).toEqual([
      { key: 'Titre original', value: 'Dune: Part Two' },
      { key: 'Sortie (Canada)', value: '1 mars 2024' },
      { key: 'Pays', value: 'États-Unis' },
    ]);
  });
});
