import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin-panel.html'),
        poslovni: resolve(__dirname, 'poslovni-panel.3f8a1c.html')
      }
    }
  }
});
