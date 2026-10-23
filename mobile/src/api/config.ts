import Constants from 'expo-constants';

type Extra = {
  apiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  deeplinkScheme?: string;
  inviteDomain?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Variables EXPO_PUBLIC_* exposées par app.config.ts (`extra`). */
export const config = {
  apiUrl: (extra.apiUrl ?? 'http://localhost:8080').replace(/\/$/, ''),
  supabaseUrl: extra.supabaseUrl ?? '',
  supabaseAnonKey: extra.supabaseAnonKey ?? '',
  deeplinkScheme: extra.deeplinkScheme ?? 'zabava',
  inviteDomain: extra.inviteDomain ?? '151-145-50-138.sslip.io',
} as const;

/** Identifiant EAS, requis pour le jeton Expo Push (absent hors build EAS). */
export function easProjectId(): string | undefined {
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
    ?.eas?.projectId;
  return fromExtra ?? Constants.easConfig?.projectId;
}
