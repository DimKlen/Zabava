import { searchRows, type SearchPage, type TitleResult } from '../search';

function title(tmdbId: number, year?: number, type: TitleResult['type'] = 'movie'): TitleResult {
  return { id: `${type}-${tmdbId}`, tmdbId, type, title: `T${tmdbId}`, year };
}

function page(titles: TitleResult[]): SearchPage {
  return { people: [], titles, page: 1, totalPages: 1 };
}

describe('searchRows', () => {
  it('garde l’ordre de pertinence du serveur, sans retrier par année', () => {
    const rows = searchRows([
      page([title(1, 2020), title(2), title(3, 2025)]),
      page([title(4, 2022)]),
    ]);
    expect(rows.map((row) => (row.kind === 'title' ? row.title.tmdbId : 0))).toEqual([1, 2, 3, 4]);
  });

  it('films puis séries puis animés, personnes à la fin', () => {
    const rows = searchRows([
      {
        people: [{ id: 9, name: 'P', knownFor: [] }],
        titles: [title(1, 2020, 'tv'), title(2, 2021, 'anime'), title(3), title(4, 2022, 'tv')],
        page: 1,
        totalPages: 1,
      },
    ]);
    expect(rows.map((row) => row.key)).toEqual(['movie-3', 'tv-1', 'tv-4', 'anime-2', 'person-9']);
  });
});
