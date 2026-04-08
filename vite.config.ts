import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // Automatically determine base path for GitHub Pages
  // Prioritize /DevLog/ for production if VITE_BASE_PATH is missing or just '/'
  const base = (env.VITE_BASE_PATH && env.VITE_BASE_PATH !== '/') 
    ? env.VITE_BASE_PATH 
    : (process.env.NODE_ENV === 'production' ? '/DevLog/' : '/');

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
