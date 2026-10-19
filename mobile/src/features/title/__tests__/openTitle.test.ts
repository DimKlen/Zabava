import { router } from 'expo-router';

import { prefetchTitle } from '@/api/titles';

import { openTitle, pressTitle, previewOf, titlePreview } from '../openTitle';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/titles', () => ({ prefetchTitle: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

const dune = {
  id: 'movie-438631',
  type: 'movie' as const,
  tmdbId: 438631,
  title: 'Dune',
  year: 2021,
};

it('ouvre la fiche et garde ce que la liste savait du titre', () => {
  openTitle(previewOf(dune, 'w342'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/title/[type]/[id]',
    params: { type: 'movie', id: '438631' },
  });
  expect(titlePreview('movie-438631')).toEqual({
    type: 'movie',
    tmdbId: 438631,
    title: 'Dune',
    posterPath: undefined,
    year: 2021,
    posterSize: 'w342',
  });
});

it('une série peut s’ouvrir sur une saison', () => {
  openTitle({ type: 'tv', tmdbId: 1399, title: 'Game of Thrones' }, 3);
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/title/[type]/[id]',
    params: { type: 'tv', id: '1399', season: '3' },
  });
});

it('le début de l’appui précharge la fiche', () => {
  pressTitle(previewOf(dune, 'w92'));
  expect(prefetchTitle).toHaveBeenCalledWith('movie', 438631);
  expect(titlePreview('movie-438631')?.posterSize).toBe('w92');
});

it('ne garde que les 50 aperçus les plus récents', () => {
  for (let tmdbId = 1; tmdbId <= 51; tmdbId++) {
    pressTitle({ type: 'movie', tmdbId, title: `Film ${tmdbId}` });
  }
  expect(titlePreview('movie-1')).toBeUndefined();
  expect(titlePreview('movie-51')?.title).toBe('Film 51');
});
