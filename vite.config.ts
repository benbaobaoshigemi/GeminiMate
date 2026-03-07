import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import manifest from './src/manifest.json';

// @ts-ignore
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@locales': resolve(__dirname, './src/locales'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/pages/popup/index.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/jszip') || id.includes('node_modules/html-to-image')) {
            return 'vendor-export';
          }
          if (id.includes('node_modules/mermaid')) {
            return 'vendor-mermaid';
          }
          if (id.includes('/src/locales/')) {
            return 'app-locales';
          }
          if (id.includes('/src/features/export/')) {
            return 'feature-export';
          }
          if (id.includes('/src/features/layout/')) {
            return 'feature-layout';
          }
          if (id.includes('/src/features/mermaid/') || id.includes('/src/features/thoughtTranslation/')) {
            return 'feature-reading';
          }
          if (id.includes('/src/features/timeline/')) {
            return 'feature-timeline';
          }
          return undefined;
        },
      },
    },
  },
});
