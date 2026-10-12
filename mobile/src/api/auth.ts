import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { parseAuthCallback } from '@/lib/authCallback';

import { syncSession } from './session';
import { supabase } from './supabase';

export type SignInResult = 'success' | 'cancelled' | 'error';

/** Chemin du lien de retour OAuth (route app/auth/callback.tsx). */
const CALLBACK_PATH = 'auth/callback';

/** Google : OAuth Supabase dans le navigateur intégré (client web). */
export function signInWithGoogle(): Promise<SignInResult> {
  return signInWithBrowser('google');
}

/** Apple : Sign in with Apple natif sur iOS, OAuth dans le navigateur ailleurs. */
export function signInWithApple(): Promise<SignInResult> {
  return Platform.OS === 'ios' ? signInWithAppleNative() : signInWithBrowser('apple');
}

async function signInWithBrowser(provider: 'google' | 'apple'): Promise<SignInResult> {
  try {
    const redirectTo = Linking.createURL(CALLBACK_PATH);
    const { data, error } = await supabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) return 'error';

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'cancel' || result.type === 'dismiss') return 'cancelled';
    if (result.type !== 'success') return 'error';

    const callback = parseAuthCallback(result.url);
    if (callback.error === 'access_denied') return 'cancelled';
    if (!callback.code) return 'error';

    const exchange = await supabase().auth.exchangeCodeForSession(callback.code);
    if (exchange.error) return 'error';
    await syncSession();
    return 'success';
  } catch {
    return 'error';
  }
}

async function signInWithAppleNative(): Promise<SignInResult> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) return 'error';
    const { error } = await supabase().auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) return 'error';
    await syncSession();
    return 'success';
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    return code === 'ERR_REQUEST_CANCELED' ? 'cancelled' : 'error';
  }
}
