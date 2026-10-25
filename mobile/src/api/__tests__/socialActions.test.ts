import { onlineManager } from '@tanstack/react-query';

import type { Member } from '@/domain/social/members';
import { useUiStore } from '@/store/ui';

import { api, ApiError } from '../http';
import { profileKey } from '../profile';
import { queryClient } from '../queryClient';
import { followRequestsKey, friendsKey, userKey, type UserProfile } from '../social';
import {
  acceptRequest,
  blockMember,
  declineRequest,
  followMember,
  patchMemberEverywhere,
  pressFollow,
  removeFriend,
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
  followState: 'none',
  followsMe: false,
  commonCount: 4,
  friendsCount: 5,
  canSeeLists: false,
  isMe: false,
};

type Pages = { pages: { items: Member[] }[]; pageParams: unknown[] };

const flush = () => new Promise((resolve) => setImmediate(resolve));
const toast = () => useUiStore.getState().toast;
const cachedLea = () => queryClient.getQueryData<UserProfile>(userKey('lea.m'));
const myProfile = () =>
  queryClient.getQueryData<{ friendsCount: number; followRequestsCount: number }>(profileKey);
const myFriends = () => queryClient.getQueryData<Pages>(friendsKey('dim.k', ''));
const myRequests = () => queryClient.getQueryData<Pages>(followRequestsKey);

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
    followRequestsCount: 1,
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

describe('ajouter en ami', () => {
  it('envoie une demande : « Demande envoyée », compteurs inchangés', async () => {
    mockApi.mockResolvedValue({ status: 'pending' });
    followMember(lea);
    expect(cachedLea()).toMatchObject({ followState: 'pending', friendsCount: 5 });
    expect(toast()?.message).toBe('Demande envoyée à @lea.m');
    await flush();
    expect(mockApi).toHaveBeenCalledWith('/users/lea.m/follow', { method: 'POST' });
    expect(myProfile()?.friendsCount).toBe(2);
  });

  it('sa demande était reçue : amis tout de suite, et ma liste d’amis est rechargée', async () => {
    const requested = { ...lea, followState: 'requested' as const };
    queryClient.setQueryData(userKey('lea.m'), requested);
    queryClient.setQueryData(followRequestsKey, {
      pages: [{ items: [requested] }],
      pageParams: [undefined],
    });
    // Ma liste d'amis déjà ouverte, sans Léa : c'est le bug « 2 amis mais liste vide ».
    queryClient.setQueryData(friendsKey('dim.k', ''), {
      pages: [{ items: [] }],
      pageParams: [undefined],
    });
    mockApi.mockResolvedValue({ status: 'accepted' });

    followMember(requested);
    expect(cachedLea()).toMatchObject({
      followState: 'following',
      followsMe: true,
      friendsCount: 6,
    });
    expect(myProfile()).toMatchObject({ friendsCount: 3, followRequestsCount: 0 });
    expect(myRequests()?.pages[0]?.items).toEqual([]);
    await flush();
    expect(toast()?.message).toBe('Léa et toi êtes maintenant amis');
    expect(queryClient.getQueryState(friendsKey('dim.k', ''))?.isInvalidated).toBe(true);
  });

  it('le serveur répond « amis » alors qu’on attendait une demande : amis', async () => {
    mockApi.mockResolvedValue({ status: 'accepted' });
    followMember(lea);
    await flush();
    expect(cachedLea()).toMatchObject({ followState: 'following', friendsCount: 6 });
    expect(myProfile()?.friendsCount).toBe(3);
  });

  it('échec : retour à l’état d’avant et message de limite', async () => {
    mockApi.mockRejectedValue(new ApiError(429, 'POST'));
    followMember(lea);
    await flush();
    expect(cachedLea()).toEqual(lea);
    expect(toast()?.message).toBe("Tu as atteint la limite de 200 demandes d'ami par jour");
  });

  it('hors ligne : rien ne change, « Connexion requise »', () => {
    onlineManager.setOnline(false);
    pressFollow(lea);
    expect(cachedLea()).toEqual(lea);
    expect(mockApi).not.toHaveBeenCalled();
    expect(toast()?.message).toBe('Connexion requise');
  });
});

describe('retirer de mes amis', () => {
  const friend: UserProfile = {
    ...lea,
    followState: 'following',
    followsMe: true,
    friendsCount: 6,
  };

  it('« Amis » ouvre « Retirer de mes amis »', () => {
    pressFollow(friend);
    const sheet = useUiStore.getState().actionSheet;
    expect(sheet?.title).toBe('@lea.m');
    expect(sheet?.options.map((option) => option.label)).toEqual(['Retirer de mes amis']);
  });

  it('toast avec « Annuler », qui rétablit l’amitié à l’écran et sur le serveur', async () => {
    queryClient.setQueryData(userKey('lea.m'), friend);
    queryClient.setQueryData(friendsKey('dim.k', ''), {
      pages: [{ items: [friend] }],
      pageParams: [undefined],
    });
    removeFriend(friend);
    expect(cachedLea()).toMatchObject({ followState: 'none', followsMe: false, friendsCount: 5 });
    expect(myProfile()?.friendsCount).toBe(1);
    expect(myFriends()?.pages[0]?.items).toEqual([]);
    await flush();
    expect(mockApi).toHaveBeenCalledWith('/users/lea.m/follow', { method: 'DELETE' });
    expect(toast()?.message).toBe('@lea.m ne fait plus partie de tes amis');

    useUiStore.getState().undoToast();
    expect(cachedLea()).toMatchObject({
      followState: 'following',
      followsMe: true,
      friendsCount: 6,
    });
    expect(myProfile()?.friendsCount).toBe(2);
    expect(myFriends()?.pages[0]?.items).toEqual([friend]);
    await flush();
    expect(mockApi).toHaveBeenLastCalledWith('/users/lea.m/follow', { method: 'POST' });
  });
});

describe('demandes reçues', () => {
  const requested: Member = { ...lea, followState: 'requested' };

  beforeEach(() => {
    queryClient.setQueryData(followRequestsKey, {
      pages: [{ items: [requested] }],
      pageParams: [undefined],
    });
  });

  it('accepter : la ligne disparaît, nous sommes amis', async () => {
    acceptRequest(requested);
    expect(myRequests()?.pages[0]?.items).toEqual([]);
    expect(myProfile()).toMatchObject({ friendsCount: 3, followRequestsCount: 0 });
    expect(cachedLea()).toMatchObject({ followState: 'following', followsMe: true });
    await flush();
    expect(mockApi).toHaveBeenCalledWith('/me/follow-requests/lea.m/accept', { method: 'POST' });
    expect(toast()?.message).toBe('Léa et toi êtes maintenant amis');
  });

  it('refuser : la ligne disparaît, sans toast ; échec : elle revient', async () => {
    mockApi.mockRejectedValue(new ApiError(500, 'POST'));
    declineRequest(requested);
    expect(myRequests()?.pages[0]?.items).toEqual([]);
    expect(cachedLea()?.followState).toBe('none');
    await flush();
    expect(myRequests()?.pages[0]?.items).toEqual([requested]);
    expect(cachedLea()?.followState).toBe('requested');
    expect(myProfile()?.followRequestsCount).toBe(1);
  });
});

describe('actions simultanées', () => {
  const max: UserProfile = { ...lea, username: 'max.dubois', displayName: 'Max Dubois' };
  const cachedMax = () => queryClient.getQueryData<UserProfile>(userKey('max.dubois'));

  it('« Annuler » ne défait que sa propre action', async () => {
    queryClient.setQueryData(userKey('lea.m'), { ...lea, followState: 'following' });
    queryClient.setQueryData(userKey('max.dubois'), max);
    removeFriend({ ...lea, followState: 'following' });
    await flush();
    const undo = toast()?.undo;
    mockApi.mockResolvedValue({ status: 'pending' });
    followMember(max);
    await flush();

    undo?.();
    expect(cachedLea()?.followState).toBe('following');
    expect(cachedMax()?.followState).toBe('pending');
  });

  it('un échec ne défait que sa propre action', async () => {
    queryClient.setQueryData(userKey('max.dubois'), max);
    let reject: (error: unknown) => void = () => undefined;
    mockApi.mockImplementationOnce(() => new Promise((_, no) => (reject = no)));
    followMember(lea);
    mockApi.mockResolvedValueOnce({ status: 'pending' });
    followMember(max);
    await flush();
    reject(new ApiError(500, 'POST'));
    await flush();

    expect(cachedLea()?.followState).toBe('none');
    expect(cachedMax()?.followState).toBe('pending');
  });
});

describe('bloquer', () => {
  it('dialogue de confirmation, puis blocage et toast', async () => {
    const friend = { ...lea, followState: 'following' as const, followsMe: true };
    queryClient.setQueryData(userKey('lea.m'), friend);
    blockMember(friend);
    const dialog = useUiStore.getState().dialog;
    expect(dialog?.title).toBe('Bloquer @lea.m ?');
    expect(dialog?.body).toBe(
      "Vous ne serez plus amis et vous n'apparaîtrez plus dans vos recherches ni sur vos fiches. Léa ne sera pas prévenu·e.",
    );
    dialog?.actions.find((action) => action.label === 'Bloquer')?.onPress?.();
    expect(cachedLea()).toMatchObject({
      followState: 'blocked',
      followsMe: false,
      friendsCount: 4,
    });
    expect(myProfile()?.friendsCount).toBe(1);
    await flush();
    expect(mockApi).toHaveBeenCalledWith('/users/lea.m/block', { method: 'POST' });
    expect(toast()?.message).toBe('@lea.m est bloqué·e');
  });

  it('bloquer quelqu’un dont j’ai reçu la demande la retire de mes demandes', () => {
    const requested = { ...lea, followState: 'requested' as const };
    queryClient.setQueryData(followRequestsKey, {
      pages: [{ items: [requested] }],
      pageParams: [undefined],
    });
    blockMember(requested);
    useUiStore
      .getState()
      .dialog?.actions.find((action) => action.label === 'Bloquer')
      ?.onPress?.();
    expect(myRequests()?.pages[0]?.items).toEqual([]);
    expect(myProfile()?.followRequestsCount).toBe(0);
  });
});
