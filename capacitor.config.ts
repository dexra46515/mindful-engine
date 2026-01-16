import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.b9bc557477734076b710d1364bf57e42',
  appName: 'Behavioral Engine',
  webDir: 'dist',
  server: {
    url: 'https://id-preview--b9bc5574-7773-4076-b710-d1364bf57e42.lovable.app?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a2e',
    },
  },
};

export default config;
