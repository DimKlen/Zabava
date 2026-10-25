import { formatShortDate } from '../../format';
import {
  followingNames,
  followingStatus,
  followingText,
  friendsOnTitle,
  type TitleHolder,
} from '../followingSummary';
import type { FollowState } from '../members';

const holder = (
  username: string,
  displayName: string,
  patch: Partial<TitleHolder> = {},
  followState: FollowState = 'following',
): TitleHolder => ({
  user: {
    username,
    displayName,
    followState,
    followsMe: false,
    commonCount: 0,
  },
  status: 'watched',
  date: '2026-10-12T20:00:00Z',
  ...patch,
});

describe('followingText', () => {
  it('1, 2, 3 et 7 amis', () => {
    expect(followingText(['Léa'])).toBe('Léa');
    expect(followingText(['Léa', 'Max'])).toBe('Léa et Max');
    expect(followingText(['Léa', 'Max', 'Sarah'])).toBe('Léa, Max et Sarah');
    expect(followingText(['Léa', 'Max', 'Sarah', 'Yanis', 'Théo', 'Camille', 'Inès'])).toBe(
      'Léa, Max et 5 autres',
    );
  });

  it('prénom = premier mot du nom affiché', () => {
    expect(followingNames([holder('lea.m', 'Léa Martin'), holder('max', 'Max')])).toEqual([
      'Léa',
      'Max',
    ]);
  });
});

describe('followingStatus', () => {
  it('film : « Vu le … » ou « Dans sa liste »', () => {
    const watched = holder('lea.m', 'Léa', { date: '2026-10-12T20:00:00Z' });
    expect(followingStatus(watched, 'movie')).toBe(
      `Vu le ${formatShortDate(new Date('2026-10-12T20:00:00Z'))}`,
    );
    expect(followingStatus(holder('lea.m', 'Léa', { status: 'towatch' }), 'movie')).toBe(
      'Dans sa liste',
    );
  });

  it('série et animé', () => {
    const status = (patch: Partial<TitleHolder>) =>
      followingStatus(holder('lea.m', 'Léa', patch), 'anime');
    expect(status({ status: 'in_progress', detail: 'S02 E05' })).toBe('En cours · S02 E05');
    expect(status({ status: 'finished' })).toBe('Terminée');
    expect(status({ status: 'abandoned' })).toBe('Abandonnée');
    expect(status({ status: 'towatch' })).toBe('Dans sa liste');
  });
});

describe('friendsOnTitle', () => {
  it('retirer un ami ou le bloquer le fait sortir de « Tes amis »', () => {
    const lea = holder('lea.m', 'Léa');
    const max = holder('max.dubois', 'Max', {}, 'none');
    const hugo = holder('hugo.p', 'Hugo', {}, 'blocked');
    expect(friendsOnTitle({ following: [lea, max, hugo] }).map((h) => h.user.username)).toEqual([
      'lea.m',
    ]);
  });
});
