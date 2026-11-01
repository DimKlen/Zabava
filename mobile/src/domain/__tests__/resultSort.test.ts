import {
  DEFAULT_RESULT_ORDER,
  resultDirectionLabel,
  sortResults,
  type Sortable,
} from '../resultSort';

type Item = Sortable & { id: string };

const ITEMS: Item[] = [
  { id: 'a', releaseDate: '2020-05-01', voteAverage: 7 },
  { id: 'b', year: 2024, voteAverage: 0 },
  { id: 'c', voteAverage: 8.5 },
  { id: 'd', releaseDate: '2010-01-01', voteAverage: 6 },
];

const ids = (items: readonly Item[]) => items.map((item) => item.id);

describe('sortResults', () => {
  it('pertinence : ordre reçu, ou inversé', () => {
    expect(ids(sortResults(ITEMS, DEFAULT_RESULT_ORDER))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(sortResults(ITEMS, { sort: 'relevance', reversed: true }))).toEqual([
      'd',
      'c',
      'b',
      'a',
    ]);
  });

  it('date de sortie : récents d’abord, sans date à la fin dans les deux sens', () => {
    expect(ids(sortResults(ITEMS, { sort: 'release', reversed: false }))).toEqual([
      'b',
      'a',
      'd',
      'c',
    ]);
    expect(ids(sortResults(ITEMS, { sort: 'release', reversed: true }))).toEqual([
      'd',
      'a',
      'b',
      'c',
    ]);
  });

  it('note : mieux notés d’abord, sans note (0 compris) à la fin dans les deux sens', () => {
    expect(ids(sortResults(ITEMS, { sort: 'rating', reversed: false }))).toEqual([
      'c',
      'a',
      'd',
      'b',
    ]);
    expect(ids(sortResults(ITEMS, { sort: 'rating', reversed: true }))).toEqual([
      'd',
      'a',
      'c',
      'b',
    ]);
  });

  it('stable à égalité et sans modifier la liste reçue', () => {
    const same: Item[] = [
      { id: 'x', voteAverage: 7 },
      { id: 'y', voteAverage: 7 },
    ];
    expect(ids(sortResults(same, { sort: 'rating', reversed: true }))).toEqual(['x', 'y']);
    expect(ids(ITEMS)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('resultDirectionLabel', () => {
  it('libellés des deux sens', () => {
    expect(resultDirectionLabel('relevance', false)).toBe('Plus pertinents');
    expect(resultDirectionLabel('relevance', true)).toBe('Moins pertinents');
    expect(resultDirectionLabel('release', false)).toBe('Plus récents');
    expect(resultDirectionLabel('release', true)).toBe('Plus anciens');
    expect(resultDirectionLabel('rating', false)).toBe('Mieux notés');
    expect(resultDirectionLabel('rating', true)).toBe('Moins bien notés');
  });
});
