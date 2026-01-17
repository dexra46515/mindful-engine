import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.b9bc557477734076b710d1364bf57e42',
  appName: 'Behavioral Engine',
  webDir: 'dist',
  /**
   * IMPORTANT:
   * - If `server.url` is set, the native app loads a remote URL (which may show a Lovable login screen).
   * - If `server.url` is NOT set, the native app loads the bundled files from `webDir`.
   *
   * For local live-reload, prefer running:
   *   npx cap run ios -l --external
   * which will inject your local dev server URL automatically.
   */
  server: process.env.CAP_SERVER_URL
    ? {
        url: process.env.CAP_SERVER_URL,
        cleartext: true,
      }
    : undefined,
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a2e',
    },
  },
};

export default config;
