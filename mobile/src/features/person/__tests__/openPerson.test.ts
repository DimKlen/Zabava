import { router } from 'expo-router';

import { prefetchPerson } from '@/api/discover';

import { openPerson, personPreview, pressPerson } from '../openPerson';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/discover', () => ({ prefetchPerson: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

it('ouvre la fiche et garde le nom et la photo', () => {
  openPerson({ id: 7467, name: 'David Fincher', profilePath: '/f.jpg' });
  expect(router.push).toHaveBeenCalledWith('/person/7467');
  expect(personPreview(7467)).toEqual({ id: 7467, name: 'David Fincher', profilePath: '/f.jpg' });
});

it('le début de l’appui précharge la fiche', () => {
  pressPerson({ id: 287, name: 'Brad Pitt' });
  expect(prefetchPerson).toHaveBeenCalledWith(287);
  expect(personPreview(287)?.name).toBe('Brad Pitt');
});
