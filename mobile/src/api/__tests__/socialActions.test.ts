import { onlineManager } from '@tanstack/react-query';

import type { Member } from '@/domain/social/members';
import { useUiStore } from '@/store/ui';

import { api, ApiError } from '../http';
import { profileKey } from '../profile';
import { queryClient } from '../queryClient';
import { connectionsKey, userKey, type UserProfile } from '../social';
import {
  blockMember,
  followMember,
  patchMemberEverywhere,
  pressFollow,
  removeFollower,
  unfollowMember,
} from '../socialActions';

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
  isPrivate: false,
  followState: 'none',
  followsMe: false,
  commonCount: 4,
  followersCount: 5,
  followingCount: 3,
  canSeeLists: true,
  isMe: false,
};

const flush = () => new Promise((resolve) => setImmediate(resolve));
const toast = () => useUiStore.getState().toast;
const cachedLea = () => queryClient.getQueryData<UserProfile>(userKey('lea.m'));
const myCounts = () => {
  const me = queryClient.getQueryData<{ followersCount: number; followingCount: number }>(
    profileKey,
  );
  return [me?.followersCount, me?.followingCount];
};

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
  queryClient.setQueryData(profileKey, { username: 'dim.k', followersCount: 2, followingCount: 7 });
  queryClient.setQueryData(userKey('lea.m'), lea);
  mockApi.mockResolvedValue(undefined);
});

afterEach(() => useUiStore.getState().hideToast());

describe('patchMemberEverywhere', () => {
  it('met à jour le membre dans les profils et les listes, sans toucher aux autres', () => {
    const max = { ...lea, username: 'max.dubois' };
    const pages = { pages: [{ items: [lea, max] }], pageParams: [undefined] };
    queryClient.setQueryData(connectionsKey('dim.k', 'following', ''), pages);

    patchMemberEverywhere('lea.m', { followState: 'following' });

    expect(cachedLea()?.followState).toBe('following');
    const list = queryClient.getQueryData<typeof pages>(connectionsKey('dim.k', 'following', ''));
    expect(list?.pages[0]?.items[0]?.followState).toBe('following');
    expect(list?.pages[0]?.items[1]).toBe(max);
  });
});

describe('suivre', () => {
  it('profil public : « Abonné » tout de suite et compteurs à jour', async () => {
    mockApi.mockResolvedValue({ status: 'accepted' });
    followMember(lea);
    expect(cachedLea()).toMatchObject({ followState: 'following', followersCount: 6 });
    expect(myCounts()).toEqual([2, 8]);
    await flush();
    expect(mockApi).toHaveBeenCalledWith('/users/lea.m/follow', { method: 'POST' });
    expect(cachedLea()?.followState).toBe('following');
  });

  it('profil privé : « Demandé » et toast, compteurs inchangés', async () => {
    mockApi.mockResolvedValue({ status: 'pending' });
    followMember({ ...lea, isPrivate: true });
    expect(cachedLea()).toMatchObject({ followState: 'pending', followersCount: 5 });
    expect(toast()?.message).toBe('Demande envoyée à @lea.m');
    await flush();
    expect(myCounts()).toEqual([2, 7]);
  });

  it('échec : retour à l’état d’avant et message de limite', async () => {
    mockApi.mockRejectedValue(new ApiError(429, 'POST'));
    followMember(lea);
    await flush();
    expect(cachedLea()).toEqual(lea);
    expect(myCounts()).toEqual([2, 7]);
    expect(toast()?.message).toBe('Tu as atteint la limite de 200 abonnements par jour');
  });

  it('hors ligne : rien ne change, « Connexion requise »', () => {
    onlineManager.setOnline(false);
    pressFollow(lea);
    expect(cachedLea()).toEqual(lea);
    expect(mockApi).not.toHaveBeenCalled();
    expect(toast()?.message).toBe('Connexion requise');
  });
});

describe('se désabonner', () => {
  const following: Member = { ...lea, followState: 'following' };

  it('« Abonné » ouvre « Se désabonner »', () => {
    pressFollow(following);
    const sheet = useUiStore.getState().actionSheet;
    expect(sheet?.title).toBe('@lea.m');
    expect(sheet?.options.map((option) => option.label)).toEqual(['Se désabonner']);
  });

  it('toast avec « Annuler », qui rétablit l’abonnement à l’écran et sur le serveur', async () => {
    queryClient.setQueryData(userKey('lea.m'), {
      ...lea,
      followState: 'following',
      followersCount: 6,
    });
    unfollowMember(following);
    expect(cachedLea()).toMatchObject({ followState: 'none', followersCount: 5 });
    expect(myCounts()).toEqual([2, 6]);
    await flush();
    expect(toast()?.message).toBe('Tu ne suis plus @lea.m');

    useUiStore.getState().undoToast();
    expect(cachedLea()).toMatchObject({ followState: 'following', followersCount: 6 });
    expect(myCounts()).toEqual([2, 7]);
    await flush();
    expect(mockApi).toHaveBeenLastCalledWith('/users/lea.m/follow', { method: 'POST' });
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
    expect(myCounts()).toEqual([2, 8]);
  });
});

describe('retirer un abonné', () => {
  it('la ligne disparaît de mes abonnés ; « Annuler » la remet', async () => {
    const follower = { ...lea, followsMe: true };
    const pages = { pages: [{ items: [follower] }], pageParams: [undefined] };
    queryClient.setQueryData(connectionsKey('dim.k', 'followers', ''), pages);

    removeFollower(follower);
    const list = () =>
      queryClient.getQueryData<typeof pages>(connectionsKey('dim.k', 'followers', ''));
    expect(list()?.pages[0]?.items).toEqual([]);
    expect(myCounts()).toEqual([1, 7]);
    await flush();
    expect(toast()?.message).toBe('@lea.m ne te suit plus');

    useUiStore.getState().undoToast();
    expect(list()?.pages[0]?.items).toEqual([follower]);
    await flush();
    expect(mockApi).toHaveBeenLastCalledWith('/me/followers/lea.m/restore', { method: 'POST' });
  });
});

describe('bloquer', () => {
  it('dialogue de confirmation, puis blocage et toast', async () => {
    blockMember({ ...lea, followState: 'following', followsMe: true });
    const dialog = useUiStore.getState().dialog;
    expect(dialog?.title).toBe('Bloquer @lea.m ?');
    expect(dialog?.body).toBe(
      "Vous ne pourrez plus vous suivre et vous n'apparaîtrez plus dans vos recherches ni sur vos fiches. Léa ne sera pas prévenu·e.",
    );
    dialog?.actions.find((action) => action.label === 'Bloquer')?.onPress?.();
    expect(cachedLea()).toMatchObject({
      followState: 'blocked',
      followsMe: false,
      followersCount: 4,
    });
    expect(myCounts()).toEqual([1, 6]);
    await flush();
    expect(mockApi).toHaveBeenCalledWith('/users/lea.m/block', { method: 'POST' });
    expect(toast()?.message).toBe('@lea.m est bloqué·e');
  });
});
