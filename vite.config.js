import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` lets the app work when served from a subpath (e.g. GitHub Pages:
// https://usuario.github.io/porramundial/). Override with VITE_BASE if needed.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
});
