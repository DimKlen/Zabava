import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { config } from './config';

let client: SupabaseClient | undefined;

/**
 * Client Supabase : session persistée dans AsyncStorage, rafraîchie automatiquement
 * tant que l'app est au premier plan. Créé à la demande : sans configuration
 * (EXPO_PUBLIC_SUPABASE_URL vide), l'app démarre quand même jusqu'à l'écran de connexion.
 */
export function supabase(): SupabaseClient {
  if (client) return client;
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY sont requis');
  }
  client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });

  if (Platform.OS !== 'web') {
    const auth = client.auth;
    AppState.addEventListener('change', (state) => {
      if (state === 'active') void auth.startAutoRefresh();
      else void auth.stopAutoRefresh();
    });
  }
  return client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}
