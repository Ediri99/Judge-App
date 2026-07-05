import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'fonts/*.woff2'],
      manifest: {
        name: 'Judge App',
        short_name: 'JudgeApp',
        description: 'Event judging app for stalls and universities',
        theme_color: '#F4F0E8',
        background_color: '#F4F0E8',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/vendor-export-*.js'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Excel/PDF export libraries are admin-only and not part of the
          // offline judge app shell — keep them out of the precached bundle.
          if (id.includes('node_modules/xlsx') || id.includes('node_modules/pdfmake')) {
            return 'vendor-export';
          }
        },
      },
    },
  },
});
