import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// base './' so the built bundle loads from file:// inside the Capacitor
// native shell as well as from any web server path.
export default defineConfig({
  base: './',
  // SINGLE=1 produces the double-clickable desktop build (npm run build:single)
  plugins: process.env.SINGLE ? [viteSingleFile()] : [],
  resolve: {
    alias: {
      // Analytics is native-only; stub the optional Firebase JS SDK the
      // Capacitor plugin's (unused) web half wants (see firebase-web-stub)
      'firebase/analytics': '/src/services/firebase-web-stub.ts',
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
});
