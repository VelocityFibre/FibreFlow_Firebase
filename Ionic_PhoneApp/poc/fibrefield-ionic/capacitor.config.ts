import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.velocityfibre.fibrefield',
  appName: 'FibreField',
  webDir: 'dist',
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
  },
  ios: {
    contentInset: 'automatic'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    },
    Camera: {
      presentationStyle: 'popover',
      quality: 90
    },
    Filesystem: {
      directory: 'Data',
      encoding: 'utf8'
    }
  }
};

export default config;