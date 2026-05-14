import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ── KeyRef Pro — Vite config with PWA (offline support) ──────────────────────
// Caches all inventory JSON files + OBP procedures so the app works fully
// offline after first visit. Locksmiths work in garages, basements, and
// parking lots where signal is unreliable.

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'data/inventory/_index.json'],
      manifest: {
        name: 'KeyRef Pro · Auto/Truck Key Reference',
        short_name: 'KeyRef Pro',
        description: 'Professional automotive key blank, transponder, and programming reference for locksmiths.',
        theme_color: '#0d0d0d',
        background_color: '#0d0d0d',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
        categories: ['business', 'productivity', 'utilities'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        // Cache strategy: data files cached aggressively (rarely change)
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/data/inventory/') ||
              url.pathname.startsWith('/data/procedures/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'keyref-data-v1',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com'
                                   || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-v1',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/data\//],
      },
      devOptions: {
        enabled: false,  // PWA disabled in dev; test via `npm run build && npm run preview`
      },
    }),
  ],
});
