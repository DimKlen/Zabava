import { render, screen, waitFor } from '@testing-library/react-native';

import { useSessionStore } from '@/api/session';
import { takePendingDeepLink } from '@/lib/pendingDeepLink';

import { UserProfileGate } from '../UserProfileGate';

jest.mock('expo-router', () => {
  const { Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');
  return { Redirect: ({ href }: { href: string }) => <MockText>{`redirect ${href}`}</MockText> };
});
jest.mock('@/api/session', () => {
  const { create } = jest.requireActual('zustand');
  return { useSessionStore: create(() => ({ status: 'signedOut', session: null })) };
});
jest.mock('../UserProfileScreen', () => {
  const { Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    UserProfileScreen: ({ username }: { username: string }) => (
      <MockText>{`profil ${username}`}</MockText>
    ),
  };
});

describe('UserProfileGate', () => {
  it('sans session : garde le lien et passe par la connexion', async () => {
    useSessionStore.setState({ status: 'signedOut' });
    await render(<UserProfileGate username="lea.m" />);
    expect(screen.getByText('redirect /login')).toBeTruthy();
    await waitFor(async () => expect(await takePendingDeepLink()).toBe('/u/lea.m'));
  });

  it('connecté : ouvre le profil sans garder de lien', async () => {
    useSessionStore.setState({ status: 'signedIn' });
    await render(<UserProfileGate username="lea.m" />);
    expect(screen.getByText('profil lea.m')).toBeTruthy();
    expect(await takePendingDeepLink()).toBeNull();
  });
});
