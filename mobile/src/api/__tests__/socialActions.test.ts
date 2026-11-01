import { onlineManager } from '@tanstack/react-query';

import type { Member } from '@/domain/social/members';
import { useUiStore } from '@/store/ui';

import { api, ApiError } from '../http';
import { profileKey } from '../profile';
import { queryClient } from '../queryClient';
import { friendsKey, userKey, type UserProfile } from '../social';
import { followMember, patchMemberEverywhere, pressFollow, unfollowMember } from '../socialActions';

jest.mock('../http', () => {
  class MockApiError extends Error {
    status: number;
    constructor(code: number) {
      super(`HTTP ${code}`);
      this.status = code;
    }
  }
  return { api: jest.fn(), ApiError: MockApiError };
});
// Le client de l'app garde ses requêtes 7 jours : ses minuteurs empêcheraient Jest de finir.
jest.mock('../queryClient', () => {
  const { QueryClient } =
    jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    queryClient: new QueryClient({
      defaultOptions: { queries: { gcTime: Infinity, retry: false } },
    }),
  };
});

const mockApi = api as jest.MockedFunction<typeof api>;

const lea: UserProfile = {
  username: 'lea.m',
  displayName: 'Léa Martin',
  followState: 'none',
  commonCount: 4,
  friendsCount: 5,
  canSeeLists: false,
  isMe: false,
};

type Pages = { pages: { items: Member[] }[]; pageParams: unknown[] };

const flush = () => new Promise((resolve) => setImmediate(resolve));
const toast = () => useUiStore.getState().toast;
const cachedLea = () => queryClient.getQueryData<UserProfile>(userKey('lea.m'));
const myProfile = () => queryClient.getQueryData<{ friendsCount: number }>(profileKey);
const myFriends = () => queryClient.getQueryData<Pages>(friendsKey('dim.k', ''));

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  onlineManager.setOnline(true);
  useUiStore.setState({
    toast: null,
    actionSheet: null,
    actionSheetOpen: false,
    dialog: null,
    dialogOpen: false,
  });
  queryClient.setQueryData(profileKey, {
    username: 'dim.k',
    friendsCount: 2,
  });
  queryClient.setQueryData(userKey('lea.m'), lea);
  mockApi.mockResolvedValue(undefined);
});

afterEach(() => useUiStore.getState().hideToast());

describe('patchMemberEverywhere', () => {
  it('met à jour le membre dans les profils et les listes, sans toucher aux autres', () => {
    const max = { ...lea, username: 'max.dubois' };
    const pages = { pages: [{ items: [lea, max] }], pageParams: [undefined] };
    queryClient.setQueryData(friendsKey('dim.k', ''), pages);

    patchMemberEverywhere('lea.m', { followState: 'following' });

    expect(cachedLea()?.followState).toBe('following');
    expect(myFriends()?.pages[0]?.items[0]?.followState).toBe('following');
    expect(myFriends()?.pages[0]?.items[1]).toBe(max);
  });
});

describe('suivre', () => {
  it('effectif tout de suite : « Tu suis @lea.m », mon compteur monte, le sien non', async () => {
    mockApi.mockResolvedValue({ status: 'accepted' });
    followMember(lea);
    expect(cachedLea()).toMatchObject({ followState: 'following', friendsCount: 5 });
    expect(myProfile()?.friendsCount).toBe(3);
    await flush();
    expect(mockApi).toHaveBeenCalledWith('/users/lea.m/follow', { method: 'POST' });
    expect(toast()?.message).toBe('Tu suis @lea.m');
  });

  it('ma liste d’abonnements déjà ouverte est rechargée', async () => {
    queryClient.setQueryData(friendsKey('dim.k', ''), {
      pages: [{ items: [] }],
      pageParams: [undefined],
    });
    followMember(lea);
    await flush();
    expect(queryClient.getQueryState(friendsKey('dim.k', ''))?.isInvalidated).toBe(true);
  });

  it('« Annuler » : retour à l’état d’avant, à l’écran et sur le serveur', async () => {
    followMember(lea);
    await flush();
    useUiStore.getState().undoToast();
    expect(cachedLea()).toEqual(lea);
    expect(myProfile()?.friendsCount).toBe(2);
    await flush();
    expect(mockApi).toHaveBeenLastCalledWith('/users/lea.m/follow', { method: 'DELETE' });
  });

  it('échec : retour à l’état d’avant et message de limite', async () => {
    mockApi.mockRejectedValue(new ApiError(429, 'POST'));
    followMember(lea);
    await flush();
    expect(cachedLea()).toEqual(lea);
    expect(myProfile()?.friendsCount).toBe(2);
    expect(toast()?.message).toBe('Tu as atteint la limite de 200 suivis par jour');
  });

  it('hors ligne : rien ne change, « Connexion requise »', () => {
    onlineManager.setOnline(false);
    pressFollow(lea);
    expect(cachedLea()).toEqual(lea);
    expect(mockApi).not.toHaveBeenCalled();
    expect(toast()?.message).toBe('Connexion requise');
  });
});

describe('ne plus suivre', () => {
  const followed: UserProfile = { ...lea, followState: 'following', friendsCount: 6 };

  it('« Suivi » ouvre « Ne plus suivre »', () => {
    pressFollow(followed);
    const sheet = useUiStore.getState().actionSheet;
    expect(sheet?.title).toBe('@lea.m');
    expect(sheet?.options.map((option) => option.label)).toEqual(['Ne plus suivre']);
  });

  it('toast avec « Annuler », qui rétablit le suivi à l’écran et sur le serveur', async () => {
    queryClient.setQueryData(userKey('lea.m'), followed);
    queryClient.setQueryData(friendsKey('dim.k', ''), {
      pages: [{ items: [followed] }],
      pageParams: [undefined],
    });
    unfollowMember(followed);
    expect(cachedLea()).toMatchObject({ followState: 'none', friendsCount: 6 });
    expect(myProfile()?.friendsCount).toBe(1);
    expect(myFriends()?.pages[0]?.items).toEqual([]);
    await flush();
    expect(mockApi).toHaveBeenCalledWith('/users/lea.m/follow', { method: 'DELETE' });
    expect(toast()?.message).toBe('Tu ne suis plus @lea.m');

    useUiStore.getState().undoToast();
    expect(cachedLea()).toMatchObject({ followState: 'following', friendsCount: 6 });
    expect(myProfile()?.friendsCount).toBe(2);
    expect(myFriends()?.pages[0]?.items).toEqual([followed]);
    await flush();
    expect(mockApi).toHaveBeenLastCalledWith('/users/lea.m/follow', { method: 'POST' });
  });

  it('« Annuler » ne recharge ma liste qu’une fois le suivi rétabli sur le serveur', async () => {
    queryClient.setQueryData(userKey('lea.m'), followed);
    queryClient.setQueryData(friendsKey('dim.k', ''), {
      pages: [{ items: [followed] }],
      pageParams: [undefined],
    });
    unfollowMember(followed);
    await flush();
    let restore: (value: unknown) => void = () => undefined;
    mockApi.mockImplementationOnce(() => new Promise((resolve) => (restore = resolve)));

    useUiStore.getState().undoToast();
    // Recharger maintenant relirait la liste d'avant la restauration, sans Léa.
    expect(queryClient.getQueryState(friendsKey('dim.k', ''))?.isInvalidated).toBe(false);
    restore(undefined);
    await flush();
    expect(queryClient.getQueryState(friendsKey('dim.k', ''))?.isInvalidated).toBe(true);
  });
});

describe('actions simultanées', () => {
  const max: UserProfile = { ...lea, username: 'max.dubois', displayName: 'Max Dubois' };
  const cachedMax = () => queryClient.getQueryData<UserProfile>(userKey('max.dubois'));

  it('« Annuler » ne défait que sa propre action', async () => {
    queryClient.setQueryData(userKey('lea.m'), { ...lea, followState: 'following' });
    queryClient.setQueryData(userKey('max.dubois'), max);
    unfollowMember({ ...lea, followState: 'following' });
    await flush();
    const undo = toast()?.undo;
    mockApi.mockResolvedValue({ status: 'accepted' });
    followMember(max);
    await flush();

    undo?.();
    expect(cachedLea()?.followState).toBe('following');
    expect(cachedMax()?.followState).toBe('following');
  });

  it('un échec ne défait que sa propre action', async () => {
    queryClient.setQueryData(userKey('max.dubois'), max);
    let reject: (error: unknown) => void = () => undefined;
    mockApi.mockImplementationOnce(() => new Promise((_, no) => (reject = no)));
    followMember(lea);
    mockApi.mockResolvedValueOnce({ status: 'accepted' });
    followMember(max);
    await flush();
    reject(new ApiError(500, 'POST'));
    await flush();

    expect(cachedLea()?.followState).toBe('none');
    expect(cachedMax()?.followState).toBe('following');
  });
});
