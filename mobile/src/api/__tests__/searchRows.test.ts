import { searchRows, type SearchPage, type TitleResult } from '../search';

function title(tmdbId: number, year?: number): TitleResult {
  return { id: `movie-${tmdbId}`, tmdbId, type: 'movie', title: `T${tmdbId}`, year };
}

function page(titles: TitleResult[]): SearchPage {
  return { people: [], titles, page: 1, totalPages: 1 };
}

describe('searchRows', () => {
  it('trie les titres du plus récent au plus ancien, sans année en dernier', () => {
    const rows = searchRows([
      page([title(1, 2020), title(2), title(3, 2025)]),
      page([title(4, 2022)]),
    ]);
    expect(rows.map((row) => (row.kind === 'title' ? row.title.tmdbId : 0))).toEqual([3, 4, 1, 2]);
  });
});
