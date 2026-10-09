import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

// Firebase Hosting serves the site at the root of the domain, as does the dev server.
// BASE_PATH is only for hosting under a sub-path (as on GitHub Pages, before the move).
const base = process.env.BASE_PATH ?? '/';
// Shown in the About screen and in problem reports (src/app/version.ts).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __COMMIT__: JSON.stringify((process.env.GITHUB_SHA ?? '').slice(0, 7)),
    // This build has a Service Worker (src/app/updates.ts registers it and offers new versions).
    __PWA__: 'true'
  },
  plugins: [
    preact(),
    VitePWA({
      // Phase 10: a new version waits until the child is on a calm screen and taps "update"
      // (src/app/updates.ts registers the worker itself and sends SKIP_WAITING).
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '.',
        name: 'MathIt – מסע בעולם החשבון',
        short_name: 'MathIt',
        description: 'לומדים ומתרגלים חשבון בעברית כמסע עם משחקים, חידות ובוסים, מגן חובה ועד כיתה ו׳, בשישה עולמות: פיות, כדורגל, כדורסל, נינג׳ה, קוביות וכוכבות הבמה. בלי פרסומות ובלי הרשמה.',
        categories: ['education', 'games', 'kids'],
        lang: 'he',
        dir: 'rtl',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fff8ee',
        theme_color: '#4c35b5',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        // Phase 10: shown by the install dialog on phones (from tests/e2e/phase10.cjs screenshots).
        screenshots: [
          { src: 'screenshots/map.png', sizes: '720x1480', type: 'image/png', form_factor: 'narrow', label: 'המסע: מפה של עשרה פרקים בעולם שבוחרים' },
          { src: 'screenshots/round.png', sizes: '720x1480', type: 'image/png', form_factor: 'narrow', label: 'משחק: עונים, מקבלים משוב והישגים' },
          { src: 'screenshots/chapter.png', sizes: '720x1480', type: 'image/png', form_factor: 'narrow', label: 'סוף פרק: הבוס בורח, כוכבים ומטבעות' },
          { src: 'screenshots/certificate.png', sizes: '720x1480', type: 'image/png', form_factor: 'narrow', label: 'סוף המסע: תעודת סיום לשמור ולשתף' }
        ]
      },
      workbox: {
        // Everything (code, font, icons) is precached: the app works offline after the first visit.
        // Worlds, games and music are separate chunks, but small enough to precache too.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // The share card is for other apps' link previews, not for the app itself.
        globIgnores: ['og-image.png', 'screenshots/**']
      }
    })
  ]
});
