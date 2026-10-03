import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

// GitHub Pages serves the site under /<repo-name>/.
// The deploy workflow sets BASE_PATH; locally the app runs at /.
const base = process.env.BASE_PATH ?? '/';
// Shown in the About screen and in problem reports (src/app/version.ts).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __COMMIT__: JSON.stringify((process.env.GITHUB_SHA ?? '').slice(0, 7))
  },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '.',
        name: 'MathIt – מסע בעולם החשבון',
        short_name: 'MathIt',
        description: 'לומדים ומתרגלים חשבון בעברית כמסע עם משחקים, חידות ובוסים: פיות, כדורגל, כדורסל ונינג׳ה. בלי פרסומות ובלי הרשמה.',
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
        ]
      },
      workbox: {
        // Everything (code, font, icons) is precached: the app works offline after the first visit.
        // Worlds, games and music are separate chunks, but small enough to precache too.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}']
      }
    })
  ]
});
