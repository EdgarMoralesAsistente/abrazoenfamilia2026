import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const DEFAULT_SHEETS_URL =
    'https://script.google.com/macros/s/AKfycbzknrMLSmdcZe2HUQIQ6nAJXzw_TA_QSiKj-Hgb-s0YvvBHbronT25t_TzDqcoZ5rOoCw/exec';

  const sheetsUrl =
    env.VITE_GOOGLE_SHEETS_WEBHOOK_URL ||
    env.GOOGLE_SHEETS_WEBHOOK_URL ||
    process.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL ||
    process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
    DEFAULT_SHEETS_URL;

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL': JSON.stringify(sheetsUrl),
      'process.env.GOOGLE_SHEETS_WEBHOOK_URL': JSON.stringify(sheetsUrl),
      'process.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL': JSON.stringify(sheetsUrl),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
