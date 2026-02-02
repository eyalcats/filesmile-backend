import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
  },
  preview: {
    port: 3001,
  },
  // Base path for production (served at /scanner via reverse proxy)
  base: process.env.NODE_ENV === 'production' ? '/scanner/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
