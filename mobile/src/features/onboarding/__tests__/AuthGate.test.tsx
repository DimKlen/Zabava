import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useProfile } from '@/api/profile';
import { useSessionStore } from '@/api/session';

import { AuthGate } from '../AuthGate';

jest.mock('expo-router', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return { Redirect: ({ href }: { href: string }) => <MockText>{`→ ${href}`}</MockText> };
});
jest.mock('@/api/session', () => {
  const { create } = jest.requireActual('zustand');
  return { useSessionStore: create(() => ({ status: 'loading', session: null })) };
});
jest.mock('@/api/profile', () => ({ useProfile: jest.fn() }));
jest.mock('@/lib/mosaic', () => ({ rememberMosaicPosters: jest.fn() }));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function mockProfile(value: Partial<ReturnType<typeof useProfile>>) {
  jest.mocked(useProfile).mockReturnValue(value as ReturnType<typeof useProfile>);
}

async function renderGate() {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <AuthGate />
    </SafeAreaProvider>,
  );
}

describe('AuthGate', () => {
  it('envoie vers /login sans session', async () => {
    useSessionStore.setState({ status: 'signedOut' });
    mockProfile({});
    await renderGate();
    expect(screen.getByText('→ /login')).toBeTruthy();
  });

  it('envoie un nouveau compte vers l’étape du pseudo', async () => {
    useSessionStore.setState({ status: 'signedIn' });
    mockProfile({ data: { id: 'u1' } });
    await renderGate();
    expect(screen.getByText('→ /onboarding/username')).toBeTruthy();
  });

  it('reprend l’onboarding à la langue une fois le pseudo choisi', async () => {
    useSessionStore.setState({ status: 'signedIn' });
    mockProfile({ data: { id: 'u1', username: 'dim.k' } });
    await renderGate();
    expect(screen.getByText('→ /onboarding/region')).toBeTruthy();
  });

  it('ouvre directement Ma liste pour un compte existant', async () => {
    useSessionStore.setState({ status: 'signedIn' });
    mockProfile({ data: { id: 'u1', onboardedAt: '2026-10-11T12:00:00Z', username: 'dim.k' } });
    await renderGate();
    expect(screen.getByText('→ /(tabs)/watchlist')).toBeTruthy();
  });

  it('demande un pseudo aux comptes créés avant la partie sociale', async () => {
    useSessionStore.setState({ status: 'signedIn' });
    mockProfile({ data: { id: 'u1', onboardedAt: '2026-10-11T12:00:00Z' } });
    await renderGate();
    expect(screen.getByText('→ /username-required')).toBeTruthy();
  });

  it('affiche l’erreur de chargement du profil', async () => {
    useSessionStore.setState({ status: 'signedIn' });
    mockProfile({ isError: true, refetch: jest.fn() });
    await renderGate();
    expect(screen.getByText('Impossible de charger')).toBeTruthy();
    expect(screen.queryByText(/→/)).toBeNull();
  });

  it('attend la session sans rien afficher', async () => {
    useSessionStore.setState({ status: 'loading' });
    mockProfile({});
    await renderGate();
    expect(screen.queryByText(/→/)).toBeNull();
  });
});
