import { formatShortDate } from '../../format';
import {
  followingNames,
  followingStatus,
  followingText,
  titleSocialView,
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
    isPrivate: false,
    followState,
    followsMe: false,
    commonCount: 0,
  },
  status: 'watched',
  date: '2026-10-12T20:00:00Z',
  ...patch,
});

describe('followingText', () => {
  it('1, 2, 3 et 7 abonnements', () => {
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

describe('titleSocialView', () => {
  const saw = [
    holder('sarah.l', 'Sarah', { date: '2026-10-20T10:00:00Z' }, 'none'),
    holder('hugo.p', 'Hugo', {}, 'none'),
    holder('nora.k', 'Nora', {}, 'none'),
  ];

  it('moins de 3 profils : « Ils l’ont vu » masqué', () => {
    expect(titleSocialView({ following: [], saw }).showsSaw).toBe(true);
    expect(titleSocialView({ following: [], saw: saw.slice(0, 2) }).showsSaw).toBe(false);
  });

  it('suivre depuis « Ils l’ont vu » fait passer la personne dans « Tes abonnements »', () => {
    const lea = holder('lea.m', 'Léa', { date: '2026-10-01T10:00:00Z' });
    const followed = saw.map((h, i) =>
      i === 0 ? { ...h, user: { ...h.user, followState: 'following' as const } } : h,
    );
    const view = titleSocialView({ following: [lea], saw: followed });
    // La plus récente d'abord.
    expect(view.following.map((h) => h.user.username)).toEqual(['sarah.l', 'lea.m']);
    expect(view.saw.map((h) => h.user.username)).toEqual(['hugo.p', 'nora.k']);
    expect(view.showsSaw).toBe(false);
  });

  it('se désabonner ou bloquer retire la personne des deux blocs', () => {
    const lea = holder('lea.m', 'Léa', {}, 'none');
    const blocked = { ...saw[1]!, user: { ...saw[1]!.user, followState: 'blocked' as const } };
    const view = titleSocialView({ following: [lea], saw: [saw[0]!, blocked, saw[2]!] });
    expect(view.following).toEqual([]);
    expect(view.saw.map((h) => h.user.username)).toEqual(['sarah.l', 'nora.k']);
  });
});
