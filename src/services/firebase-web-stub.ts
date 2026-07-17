// Build-time stand-in for the 'firebase/analytics' JS SDK.
// The @capacitor-firebase/analytics plugin ships a web implementation that
// imports the (heavy, optional) Firebase JS SDK — but this game only ever
// uses analytics on NATIVE, where the real SDK lives in the iOS binary and
// the web implementation is never invoked. Aliasing the SDK to this stub
// (see vite.config.ts) keeps the bundle slim and the build green without
// installing firebase. Every function throws so any accidental web use
// fails loudly instead of silently pretending to track.

const never = (): never => {
  throw new Error('firebase JS SDK not bundled: analytics is native-only');
};

export const getAnalytics = never;
export const logEvent = never;
export const setAnalyticsCollectionEnabled = never;
export const setConsent = never;
export const setUserId = never;
export const setUserProperties = never;
