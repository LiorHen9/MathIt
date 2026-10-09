// Draws public/og-image.png: the picture a shared link shows in WhatsApp, Telegram, Facebook…
// (1200×630, the size those apps expect; index.html points og:image and twitter:image at it).
//
//   bun scripts/og-image.ts                                   → writes scripts/og-image.html, then
//   NODE_PATH=$(npm root -g) node scripts/og-image-shot.cjs   → screenshots it into public/og-image.png
//
// Original art only: the app icon, the base world's colours, the app's own font (public/fonts),
// number bubbles like the game's, and the six worlds' icons. No real characters or brands.
import { readFileSync, writeFileSync } from 'node:fs';
import { BASE } from '../src/worlds/base';

const icon = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8').replace('<svg ', '<svg class="logo-icon" ');
const v = BASE.light;
const bubbles = [
  { n: '12', c: v['num-2'], x: 0, y: 30, r: 74 },
  { n: '9', c: v['num-1'], x: 150, y: 0, r: 60 },
  { n: '15', c: v['num-3'], x: 40, y: 150, r: 62 },
  { n: '8', c: v['num-4'], x: 205, y: 120, r: 52 }
];
const html = `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8">
<style>
@font-face { font-family: Rubik; src: url('../public/fonts/rubik.woff2') format('woff2'); font-weight: 400 800; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; background: ${v.brand}; font-family: Rubik, sans-serif; color: #fff; position: relative; }
.glow { position: absolute; inset: 0; background: radial-gradient(circle at 18% 30%, rgba(255,255,255,.16), transparent 42%), radial-gradient(circle at 85% 90%, rgba(255,182,39,.28), transparent 40%); }
.wrap { position: relative; display: flex; align-items: center; gap: 56px; height: 100%; padding: 0 76px; }
.text { flex: 1; display: flex; flex-direction: column; gap: 20px; }
.logo { display: flex; align-items: center; gap: 22px; direction: ltr; justify-content: flex-end; font-size: 96px; font-weight: 800; letter-spacing: -1px; }
.logo-icon { width: 104px; height: 104px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,.25); outline: 4px solid rgba(255,255,255,.85); }
h1 { font-size: 60px; font-weight: 800; line-height: 1.1; }
p { font-size: 30px; line-height: 1.4; color: #e9e5ff; }
.chips { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 6px; }
.chip { padding: 8px 20px; border-radius: 999px; background: rgba(255,255,255,.16); font-size: 25px; font-weight: 600; }
.art { flex: none; position: relative; width: 380px; height: 420px; }
.card { position: absolute; inset: 70px 0 auto 0; height: 300px; border-radius: 36px; background: ${v.bg}; box-shadow: 0 26px 60px rgba(0,0,0,.3); }
.math { position: absolute; top: 112px; left: 0; right: 0; text-align: center; direction: ltr; font-size: 84px; font-weight: 800; color: ${v.ink}; }
.q { color: ${v.brand}; }
.stars { position: absolute; top: 18px; left: 0; right: 0; text-align: center; font-size: 64px; letter-spacing: 10px; color: ${v.accent}; }
.bubbles { position: absolute; left: 30px; top: 190px; width: 330px; height: 230px; }
.b { position: absolute; display: grid; place-items: center; border-radius: 50%; color: #fff; font-weight: 800; box-shadow: inset -6px -8px 0 rgba(0,0,0,.15), 0 8px 18px rgba(0,0,0,.2); direction: ltr; }
.worlds { font-size: 34px; letter-spacing: 6px; }
</style></head><body>
<div class="glow"></div>
<div class="wrap">
  <div class="text">
    <div class="logo">MathIt ${icon}</div>
    <h1>מסע בעולם החשבון</h1>
    <p>שיעורים מונפשים, משחקים, חידות ובוסים – מגן חובה ועד כיתה ו׳.</p>
    <div class="worlds">🧚 ⚽ 🏀 🥷 🧱 🎤</div>
    <div class="chips"><span class="chip">בעברית</span><span class="chip">בלי פרסומות</span><span class="chip">בלי הרשמה</span><span class="chip">עובד גם בלי אינטרנט</span></div>
  </div>
  <div class="art">
    <div class="stars">★★★</div>
    <div class="card"></div>
    <div class="math">7 + 5 = <span class="q">?</span></div>
    <div class="bubbles">${bubbles.map((b) => `<span class="b" style="left:${b.x}px;top:${b.y}px;width:${b.r * 2}px;height:${b.r * 2}px;background:${b.c};font-size:${Math.round(b.r * 0.8)}px">${b.n}</span>`).join('')}</div>
  </div>
</div>
</body></html>`;

writeFileSync(new URL('./og-image.html', import.meta.url), html);
console.log('wrote scripts/og-image.html');
