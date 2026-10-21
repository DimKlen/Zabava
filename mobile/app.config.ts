import type { ExpoConfig } from 'expo/config';

// Valeurs du thème Nocturne (specs/docs/02-design-tokens.md) : la config native
// ne peut pas importer src/theme, d'où la répétition ici.
const BG = '#161826';
const ACCENT = '#9184d9';

const config: ExpoConfig = {
  name: 'Zabava',
  slug: 'zabava',
  owner: 'dimklen',
  scheme: 'zabava',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  icon: './assets/icon.png',
  backgroundColor: BG,
  ios: {
    bundleIdentifier: 'com.zabava.app',
    supportsTablet: false,
    usesAppleSignIn: true,
  },
  android: {
    package: 'com.zabava.app',
    // Sur EAS, variable de fichier ; en local, copie non versionnée.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    adaptiveIcon: {
      backgroundColor: BG,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-image',
    'expo-localization',
    'expo-web-browser',
    'expo-font',
    'expo-apple-authentication',
    // Petite icône de la barre d'état (blanche sur transparent), teintée en accent.
    ['expo-notifications', { icon: './assets/notification-icon.png', color: ACCENT }],
    ['expo-status-bar', { style: 'light' }],
    [
      'expo-splash-screen',
      {
        backgroundColor: BG,
        image: './assets/splash-icon.png',
        imageWidth: 120,
        resizeMode: 'contain',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    deeplinkScheme: process.env.EXPO_PUBLIC_DEEPLINK_SCHEME ?? 'zabava',
    eas: { projectId: 'b7db8a7c-ea84-4aa5-8f42-5c1218ac33f7' },
  },
};

export default config;
