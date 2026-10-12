import { act, renderHook } from '@testing-library/react-native';

import type { PosterTitle } from '@/api/catalog';
import { addTitle, removeTitle } from '@/api/library';
import { hapticLight } from '@/lib/haptics';

import { useOnboardingTitles } from '../useOnboardingTitles';

jest.mock('@/api/library', () => ({
  addTitle: jest.fn(() => Promise.resolve()),
  removeTitle: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/lib/haptics', () => ({ hapticLight: jest.fn() }));

const dune: PosterTitle = { id: 'movie-693134', tmdbId: 693134, type: 'movie', title: 'Dune' };
const frieren: PosterTitle = {
  id: 'anime-209867',
  tmdbId: 209867,
  type: 'anime',
  title: 'Frieren',
};

beforeEach(() => jest.clearAllMocks());

describe('useOnboardingTitles', () => {
  it('ajoute un film à « À voir » et suit un animé, avec haptique', async () => {
    const { result } = await renderHook(() => useOnboardingTitles());

    await act(async () => result.current.toggle(dune));
    await act(async () => result.current.toggle(frieren));

    expect(result.current.added.size).toBe(2);
    expect(addTitle).toHaveBeenCalledWith(693134, 'movie', 'towatch');
    expect(addTitle).toHaveBeenCalledWith(209867, 'anime', 'following');
    expect(hapticLight).toHaveBeenCalledTimes(2);
  });

  it('un second tap retire le titre', async () => {
    const { result } = await renderHook(() => useOnboardingTitles());

    await act(async () => result.current.toggle(dune));
    await act(async () => result.current.toggle(dune));

    expect(result.current.added.size).toBe(0);
    expect(removeTitle).toHaveBeenCalledWith('movie-693134');
  });

  it('rétablit l’état si l’ajout échoue', async () => {
    jest.mocked(addTitle).mockRejectedValueOnce(new Error('hors ligne'));
    const { result } = await renderHook(() => useOnboardingTitles());

    await act(async () => result.current.toggle(dune));

    expect(result.current.added.has(dune.id)).toBe(false);
  });
});
