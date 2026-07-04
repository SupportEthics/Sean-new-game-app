import { defineConfig } from 'vite';

// base './' so the built bundle loads from file:// inside the Capacitor
// native shell as well as from any web server path.
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
});
