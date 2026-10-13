import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works on any Cloudflare URL (root or sub-path).
  base: './',
  server: { port: 5173, open: true },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000, // Phaser itself is ~1.2 MB minified
  },
});
