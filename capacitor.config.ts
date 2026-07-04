import type { CapacitorConfig } from '@capacitor/cli';

// Native shell configuration. The appId must match the identifiers created
// in App Store Connect and Google Play Console at the store-readiness
// milestone — change it there and here together, never after release.
const config: CapacitorConfig = {
  appId: 'uk.co.supportethics.soulforgeknight',
  appName: 'Soulforge Knight',
  webDir: 'dist',
  backgroundColor: '#2a1c10',
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#2a1c10',
  },
  plugins: {
    // Consent handling (UMP) is configured at M6 store readiness; until the
    // real app IDs exist we initialize AdMob in test mode from code.
  },
};

export default config;
