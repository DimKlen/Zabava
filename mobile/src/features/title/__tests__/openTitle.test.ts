import { Image } from 'expo-image';
import { router } from 'expo-router';

import { prefetchTitle } from '@/api/titles';

import { openTitle, pressTitle, previewOf, titlePreview } from '../openTitle';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-image', () => ({ Image: { prefetch: jest.fn(() => Promise.resolve(true)) } }));
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
    backdropPath: undefined,
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
  // Sans image de fond connue, rien à précharger.
  expect(Image.prefetch).not.toHaveBeenCalled();
});

it('le début de l’appui précharge aussi l’image de fond de la fiche, à la taille de l’en-tête', () => {
  pressTitle(previewOf({ ...dune, backdropPath: '/fond.jpg' }, 'w342'));
  expect(Image.prefetch).toHaveBeenCalledWith(
    'https://image.tmdb.org/t/p/w780/fond.jpg',
    'memory-disk',
  );
  expect(titlePreview('movie-438631')?.backdropPath).toBe('/fond.jpg');
});

it('ne garde que les 50 aperçus les plus récents', () => {
  for (let tmdbId = 1; tmdbId <= 51; tmdbId++) {
    pressTitle({ type: 'movie', tmdbId, title: `Film ${tmdbId}` });
  }
  expect(titlePreview('movie-1')).toBeUndefined();
  expect(titlePreview('movie-51')?.title).toBe('Film 51');
});
