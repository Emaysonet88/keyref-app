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
      // All icon files plus inventory index get precached so the install
      // experience and offline mode work on first visit.
      includeAssets: [
        'favicon.ico',
        'favicon.png',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
        'data/inventory/_index.json',
      ],
      manifest: {
        name: 'KeyRef Pro · Auto/Truck Key Reference',
        short_name: 'KeyRef Pro',
        description: 'Professional automotive key blank, transponder, and programming reference for locksmiths.',
        // Amber accent — drives the Android status bar color when the PWA
        // is open standalone. Was #0d0d0d (dark) before; brand color reads
        // more premium and matches the in-app accent.
        theme_color: '#F5A623',
        // Splash screen background, shown briefly on PWA launch
        background_color: '#0d0d0d',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        // Three icons total: 192 + 512 for standard "any" purpose, plus a
        // 512 maskable variant with safe-zone bleed for Android adaptive
        // icons (circle/squircle/rounded-square crops on different launchers).
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        categories: ['business', 'productivity', 'utilities'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
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
