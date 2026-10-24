import { movieCrew, movieInfos, movieMeta, movieStatus, noOfferText } from '../movieDetail';
import { seriesCrew } from '../seriesDetail';

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

  it('sorti en salle il y a plus de 60 jours, numérique à venir : toujours au cinéma', () => {
    // « L'Odyssée » : en salle le 17 juillet, en numérique le 17 novembre.
    expect(
      movieStatus(
        { releaseTheatrical: '2026-07-17', releaseDigital: '2026-11-17', availability: none },
        TODAY,
      ),
    ).toEqual({ state: 'cinema', digital: false, text: 'Au cinéma maintenant' });
  });

  it('numérique passé, sans offre : inconnu', () => {
    expect(
      movieStatus(
        { releaseTheatrical: '2026-03-01', releaseDigital: '2026-05-01', availability: none },
        TODAY,
      ).state,
    ).toBe('unknown');
  });

  it('offre en précommande : pas de « depuis » une date à venir', () => {
    expect(
      movieStatus(
        {
          releaseTheatrical: '2026-07-17',
          releaseDigital: '2026-11-17',
          availability: { ...none, rent: [crave] },
        },
        TODAY,
      ).text,
    ).toBe('Disponible en streaming');
  });
});

describe('noOfferText (« Où regarder » sans plateforme)', () => {
  const odyssey = { releaseTheatrical: '2026-07-17', availability: none };

  it('au cinéma, en numérique plus tard aux États-Unis', () => {
    expect(
      noOfferText(
        { ...odyssey, releaseDigital: '2026-11-17', releaseDigitalCountry: 'US' },
        'CA',
        TODAY,
      ),
    ).toBe("Seulement au cinéma pour l'instant. En numérique le 17 novembre 2026 (États-Unis).");
  });

  it('date de ma région : sans pays', () => {
    expect(
      noOfferText(
        { ...odyssey, releaseDigital: '2026-11-17', releaseDigitalCountry: 'CA' },
        'CA',
        TODAY,
      ),
    ).toBe("Seulement au cinéma pour l'instant. En numérique le 17 novembre 2026.");
  });

  it('pas encore en salle, date numérique annoncée', () => {
    expect(
      noOfferText(
        { releaseTheatrical: '2026-12-01', releaseDigital: '2027-02-01', availability: none },
        'CA',
        TODAY,
      ),
    ).toBe('En numérique le 1 février 2027.');
  });

  it('sorti récemment, sans date numérique', () => {
    expect(noOfferText({ releaseTheatrical: '2026-09-20', availability: none }, 'CA', TODAY)).toBe(
      "Seulement au cinéma pour l'instant.",
    );
  });

  it('sinon : disponibilité inconnue', () => {
    expect(noOfferText({ releaseTheatrical: '2025-06-01', availability: none }, 'CA', TODAY)).toBe(
      'Disponibilité inconnue.',
    );
    expect(
      noOfferText(
        { releaseTheatrical: '2026-03-01', releaseDigital: '2026-05-01', availability: none },
        'CA',
        TODAY,
      ),
    ).toBe('Disponibilité inconnue.');
  });
});

describe('Équipe et Infos', () => {
  it('masque les lignes vides', () => {
    expect(movieCrew({ directors: ['Denis Villeneuve'], writers: [] })).toEqual([
      { key: 'Réalisation', value: 'Denis Villeneuve' },
    ]);
  });

  it('rend les réalisateurs cliquables quand les identifiants sont connus', () => {
    expect(
      movieCrew({ directors: ['A', 'B'], directorIds: [1, 2], writers: [] })[0]?.people,
    ).toEqual([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ]);
    expect(
      movieCrew({ directors: ['A', 'B'], directorIds: [1], writers: [] })[0]?.people,
    ).toBeUndefined();
  });

  it('rend les scénaristes et les créateurs de séries cliquables', () => {
    expect(movieCrew({ directors: [], writers: ['Greta Gerwig'], writerIds: [45400] })[0]).toEqual({
      key: 'Scénario',
      value: 'Greta Gerwig',
      people: [{ id: 45400, name: 'Greta Gerwig' }],
    });
    expect(seriesCrew(['Christopher Storer'], ['FX'], [9])).toEqual([
      {
        key: 'Création',
        value: 'Christopher Storer',
        people: [{ id: 9, name: 'Christopher Storer' }],
      },
      { key: 'Diffusion', value: 'FX' },
    ]);
  });

  it('affiche la sortie', () => {
    expect(
      movieInfos({
        originalTitle: 'Dune: Part Two',
        releaseTheatrical: '2024-03-01',
        country: 'États-Unis',
      }),
    ).toEqual([
      { key: 'Titre original', value: 'Dune: Part Two' },
      { key: 'Sortie', value: '1 mars 2024' },
      { key: 'Pays', value: 'États-Unis' },
    ]);
  });
});
