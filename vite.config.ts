import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// base './' so the built bundle loads from file:// inside the Capacitor
// native shell as well as from any web server path.
export default defineConfig({
  base: './',
  // SINGLE=1 produces the double-clickable desktop build (npm run build:single)
  plugins: process.env.SINGLE ? [viteSingleFile()] : [],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
});
