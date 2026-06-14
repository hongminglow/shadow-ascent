import { defineConfig } from 'vite';

// Plain Three.js game — no framework plugins needed.
export default defineConfig({
  base: './',
  server: {
    open: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
  },
});
