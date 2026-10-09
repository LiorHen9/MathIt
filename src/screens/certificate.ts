// The end-of-journey certificate (phase 10): one SVG, drawn in the world's colours, shown on the
// finale screen and saved or shared as a PNG. The SVG is a string with real colours (read from the
// world's CSS variables when it is drawn), so the very same picture becomes the image file; for the
// file the Rubik font is embedded too (a picture made from an SVG cannot use the page's fonts).
// All text is the app's own; nothing is sent anywhere – sharing goes through the phone's share sheet.

export interface CertificateText {
  name: string;
  /** "סיים את כל המסע" by the child's gender. */
  line: string;
  /** "10 פרקים · 152 כוכבים · 9 חידות" */
  facts: string;
  world: string;
  /** The world's icon (an emoji). */
  icon: string;
  /** "9.10.2026" */
  date: string;
}

export interface CertificateColors {
  bg: string;
  surface: string;
  ink: string;
  soft: string;
  brand: string;
  accent: string;
  line: string;
}

/** The world's colours, as the page has them now. */
export function readColors(el: Element = document.documentElement): CertificateColors {
  const css = getComputedStyle(el);
  const v = (name: string, fallback: string) => css.getPropertyValue(`--${name}`).trim() || fallback;
  return {
    bg: v('bg', '#fff8ee'),
    surface: v('surface', '#ffffff'),
    ink: v('ink', '#1f1a2e'),
    soft: v('ink-soft', '#5a5370'),
    brand: v('brand', '#4c35b5'),
    accent: v('accent', '#f7b733'),
    line: v('line', '#e5dccf')
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const CERT_W = 600;
export const CERT_H = 420;

/** The certificate as an SVG document (`font`: a data: URL of the font to embed, for the file). */
export function certificateSvg(t: CertificateText, c: CertificateColors, font?: string): string {
  const fontFace = font ? `@font-face{font-family:Rubik;src:url(${font}) format('woff2');font-weight:400 800}` : '';
  const star = (x: number, y: number, r: number) => {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      return `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="${c.accent}"/>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CERT_W} ${CERT_H}" width="${CERT_W}" height="${CERT_H}" role="img" aria-label="${esc(`תעודת סיום של ${t.name}`)}">
<style>${fontFace}text{font-family:Rubik,'Arial Hebrew',Arial,sans-serif}</style>
<rect width="${CERT_W}" height="${CERT_H}" rx="28" fill="${c.bg}"/>
<rect x="16" y="16" width="${CERT_W - 32}" height="${CERT_H - 32}" rx="20" fill="${c.surface}" stroke="${c.brand}" stroke-width="6"/>
<rect x="30" y="30" width="${CERT_W - 60}" height="${CERT_H - 60}" rx="14" fill="none" stroke="${c.accent}" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>
${star(64, 64, 16)}${star(CERT_W - 64, 64, 16)}${star(64, CERT_H - 64, 16)}${star(CERT_W - 64, CERT_H - 64, 16)}
<text x="${CERT_W / 2}" y="86" text-anchor="middle" direction="rtl" font-size="38" font-weight="800" fill="${c.brand}">תעודת סיום</text>
<text x="${CERT_W / 2}" y="118" text-anchor="middle" font-size="17" font-weight="600" fill="${c.soft}">MathIt · מסע בעולם החשבון</text>
<line x1="170" y1="138" x2="${CERT_W - 170}" y2="138" stroke="${c.line}" stroke-width="2"/>
<text x="${CERT_W / 2}" y="196" text-anchor="middle" direction="rtl" font-size="46" font-weight="800" fill="${c.ink}">${esc(t.name)}</text>
<text x="${CERT_W / 2}" y="238" text-anchor="middle" direction="rtl" font-size="24" font-weight="700" fill="${c.ink}">${esc(t.line)}</text>
<text x="${CERT_W / 2}" y="274" text-anchor="middle" direction="rtl" font-size="18" font-weight="600" fill="${c.soft}">${esc(t.facts)}</text>
<circle cx="${CERT_W / 2}" cy="330" r="34" fill="${c.accent}"/>
<circle cx="${CERT_W / 2}" cy="330" r="27" fill="none" stroke="${c.surface}" stroke-width="2.5" stroke-dasharray="3 5"/>
<text x="${CERT_W / 2}" y="342" text-anchor="middle" font-size="32">🏆</text>
<text x="120" y="340" text-anchor="middle" direction="rtl" font-size="17" font-weight="700" fill="${c.ink}">${esc(`${t.icon} ${t.world}`)}</text>
<text x="${CERT_W - 120}" y="340" text-anchor="middle" font-size="17" font-weight="700" fill="${c.ink}">${esc(t.date)}</text>
</svg>`;
}

/** The font as a data: URL (for the image file), or undefined if it cannot be read. */
async function fontData(): Promise<string | undefined> {
  try {
    const res = await fetch(new URL('fonts/rubik.woff2', document.baseURI).href);
    if (!res.ok) return undefined;
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:font/woff2;base64,${btoa(bin)}`;
  } catch {
    return undefined;
  }
}

/** The certificate as a PNG file (twice the size, sharp on a phone). */
export async function certificatePng(t: CertificateText, c: CertificateColors): Promise<File> {
  const svg = certificateSvg(t, c, await fontData());
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('certificate image'));
      img.src = url;
    });
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = CERT_W * scale;
    canvas.height = CERT_H * scale;
    const g = canvas.getContext('2d')!;
    // The page colour behind the rounded corners (a picture app would show them black).
    g.fillStyle = c.bg;
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'));
    return new File([blob], 'mathit-certificate.png', { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(url);
  }
}
