// A small particle system on one Canvas above the whole screen (docs/ARCHITECTURE.md §6.5):
// sparkles for a right answer or a star, confetti for the end of a round, and each world's own
// (phase 5): a rainbow trail (fairies), grass flying off a kick (football), fire (basketball),
// sparks and smoke (ninja), little blocks (blocks), music notes (stage). It ignores touches,
// is hidden from screen readers, runs only while there are particles, never holds more than
// MAX_PARTICLES (LOW_END_MAX, and half of each burst, on a weak phone – phase 10), and does nothing
// at all with reduced motion.
// Colours are the world's CSS variables, read when a burst starts.
import { reducedMotion, type Point } from './motion';

export const MAX_PARTICLES = 180;
/** Phase 10: on a weak phone, half the particles and this cap (and a 1× canvas). */
export const LOW_END_MAX = 90;

let weak: boolean | null = null;
/**
 * A weak phone: few cores or little memory (navigator.hardwareConcurrency ≤ 4, deviceMemory ≤ 2GB,
 * where the browser says). Celebrations stay, just lighter, so the frame rate holds.
 */
export function lowEnd(): boolean {
  if (weak === null) {
    const nav = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { deviceMemory?: number });
    const cores = nav?.hardwareConcurrency ?? 0;
    const mem = nav?.deviceMemory ?? 0;
    weak = (cores > 0 && cores <= 4) || (mem > 0 && mem <= 2);
  }
  return weak;
}

/** The most particles on the screen at once on this phone. */
export function particleCap(): number {
  return lowEnd() ? LOW_END_MAX : MAX_PARTICLES;
}

export type ParticleKind = 'sparkle' | 'confetti' | 'rainbow' | 'leaf' | 'spark' | 'smoke' | 'block' | 'note' | 'flame';
export const PARTICLE_KINDS: readonly ParticleKind[] = ['sparkle', 'confetti', 'rainbow', 'leaf', 'spark', 'smoke', 'block', 'note', 'flame'];

interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rotation and spin (confetti). */
  r: number;
  vr: number;
  size: number;
  color: string;
  /** Seconds lived / to live. */
  age: number;
  life: number;
}

let canvas: HTMLCanvasElement | null = null;
let g: CanvasRenderingContext2D | null = null;
let live: Particle[] = [];
let raf = 0;
let last = 0;
let dpr = 1;

const PALETTE_VARS = ['--accent', '--brand', '--num-1', '--num-2', '--num-3', '--num-4', '--good'];
/** Some kinds keep to a few of the world's colours. */
const KIND_VARS: Partial<Record<ParticleKind, string[]>> = {
  rainbow: ['--num-1', '--num-4', '--accent', '--num-3', '--num-2', '--brand'],
  leaf: ['--good', '--num-3', '--brand'],
  spark: ['--accent', '--hero-light', '--accent'],
  smoke: ['--ink-soft', '--line'],
  flame: ['--accent', '--num-4', '--danger']
};

function palette(kind: ParticleKind): string[] {
  const css = getComputedStyle(document.documentElement);
  const out = (KIND_VARS[kind] ?? PALETTE_VARS).map((v) => css.getPropertyValue(v).trim()).filter(Boolean);
  return out.length ? out : ['#ffb627'];
}

/** Launch angle, speed, size and life for a kind. */
function launch(kind: ParticleKind, i: number, n: number): { a: number; speed: number; size: number; life: number } {
  switch (kind) {
    case 'confetti':
      return { a: rand(-Math.PI * 0.85, -Math.PI * 0.15), speed: rand(260, 620), size: rand(6, 11), life: rand(1.3, 2.1) };
    case 'leaf':
    case 'block':
      return { a: rand(-Math.PI * 0.9, -Math.PI * 0.1), speed: rand(160, 400), size: rand(4, 8), life: rand(0.8, 1.3) };
    case 'rainbow':
      // A fan across the top, colour by position: a little rainbow arc.
      return { a: -Math.PI + (Math.PI * (i + 0.5)) / n, speed: rand(150, 200), size: rand(3.5, 5.5), life: rand(0.7, 1) };
    case 'spark':
      return { a: rand(0, Math.PI * 2), speed: rand(260, 480), size: rand(2, 3.5), life: rand(0.25, 0.45) };
    case 'smoke':
      return { a: rand(0, Math.PI * 2), speed: rand(30, 90), size: rand(7, 13), life: rand(0.7, 1.1) };
    case 'flame':
      return { a: rand(-Math.PI * 0.8, -Math.PI * 0.2), speed: rand(70, 190), size: rand(4, 8), life: rand(0.5, 0.85) };
    case 'note':
      return { a: rand(-Math.PI * 0.85, -Math.PI * 0.15), speed: rand(70, 150), size: rand(6, 9), life: rand(0.9, 1.3) };
    default:
      return { a: rand(0, Math.PI * 2), speed: rand(90, 260), size: rand(3, 6.5), life: rand(0.45, 0.8) };
  }
}

function ensureCanvas(): boolean {
  if (typeof document === 'undefined') return false;
  if (canvas && canvas.isConnected && g) return true;
  canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.count = '0';
  canvas.dataset.cap = String(particleCap());
  document.body.append(canvas);
  g = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  return !!g;
}

function resize(): void {
  if (!canvas) return;
  dpr = lowEnd() ? 1 : Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
}

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

/** A burst at a screen point. `count` is a wish: the total never goes over MAX_PARTICLES. */
export function burst(at: Point, kind: ParticleKind = 'sparkle', count = 18): number {
  if (reducedMotion() || !ensureCanvas()) return 0;
  const colors = palette(kind);
  const room = Math.max(0, particleCap() - live.length);
  const n = Math.min(Math.round(lowEnd() ? count / 2 : count), room);
  for (let i = 0; i < n; i++) {
    const { a, speed, size, life } = launch(kind, i, n);
    live.push({
      kind,
      x: at.x,
      y: at.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      r: rand(0, Math.PI),
      vr: rand(-9, 9),
      size,
      color: kind === 'rainbow' ? colors[Math.floor((i / n) * colors.length)] : colors[i % colors.length],
      age: 0,
      life
    });
  }
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  return n;
}

/** Confetti from the top corners of the screen. */
export function confetti(count = 90): number {
  if (typeof window === 'undefined') return 0;
  const w = window.innerWidth;
  return burst({ x: w * 0.2, y: window.innerHeight * 0.45 }, 'confetti', count / 2) + burst({ x: w * 0.8, y: window.innerHeight * 0.45 }, 'confetti', count / 2);
}

/** Remove every particle at once (a skipped celebration, leaving the screen). */
export function clearParticles(): void {
  live = [];
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  if (g && canvas) g.clearRect(0, 0, canvas.width, canvas.height);
  if (canvas) canvas.dataset.count = '0';
}

export function particleCount(): number {
  return live.length;
}

function sparkle(c: CanvasRenderingContext2D, s: number): void {
  // A four-pointed twinkle.
  c.beginPath();
  c.moveTo(0, -s * 1.8);
  c.quadraticCurveTo(s * 0.25, -s * 0.25, s * 1.8, 0);
  c.quadraticCurveTo(s * 0.25, s * 0.25, 0, s * 1.8);
  c.quadraticCurveTo(-s * 0.25, s * 0.25, -s * 1.8, 0);
  c.quadraticCurveTo(-s * 0.25, -s * 0.25, 0, -s * 1.8);
  c.fill();
}

/** A music note: a head and a stem with a flag. */
function noteShape(c: CanvasRenderingContext2D, s: number): void {
  c.beginPath();
  c.ellipse(0, s * 0.6, s * 0.55, s * 0.4, -0.4, 0, Math.PI * 2);
  c.fill();
  c.fillRect(s * 0.38, -s * 1.1, s * 0.18, s * 1.75);
  c.beginPath();
  c.moveTo(s * 0.5, -s * 1.1);
  c.quadraticCurveTo(s * 1.2, -s * 0.7, s * 0.9, -s * 0.1);
  c.lineTo(s * 0.5, -s * 0.6);
  c.fill();
}

/** Move one particle by its kind's physics. */
function move(p: Particle, dt: number): void {
  switch (p.kind) {
    case 'confetti':
      p.vy += 700 * dt;
      p.vx *= 1 - 1.2 * dt;
      p.vy *= 1 - 0.6 * dt;
      break;
    case 'leaf':
    case 'block':
      p.vy += 760 * dt;
      p.vx *= 1 - 1.5 * dt;
      break;
    case 'smoke':
      p.vx *= 1 - 2 * dt;
      p.vy = p.vy * (1 - 2 * dt) - 30 * dt;
      break;
    case 'flame':
      p.vx *= 1 - 3 * dt;
      p.vy = p.vy * (1 - 1.5 * dt) - 90 * dt;
      break;
    case 'note':
      p.vx = Math.sin(p.age * 7 + p.r) * 30;
      p.vy *= 1 - 1.2 * dt;
      break;
    case 'spark':
      p.vx *= 1 - 6 * dt;
      p.vy *= 1 - 6 * dt;
      break;
    default:
      p.vx *= 1 - 3.5 * dt;
      p.vy *= 1 - 3.5 * dt;
      p.vy += 40 * dt;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.r += p.vr * dt;
}

/** Draw one particle at the origin (already moved and turned). */
function draw(c: CanvasRenderingContext2D, p: Particle, t: number): void {
  switch (p.kind) {
    case 'confetti': {
      // A tumbling paper strip: its width wobbles as it turns.
      const w = Math.abs(Math.cos(p.r * 1.7));
      c.fillRect(-p.size / 2, (-p.size / 4) * w - 1, p.size, (p.size / 2) * w + 2);
      return;
    }
    case 'leaf':
      c.beginPath();
      c.ellipse(0, 0, p.size, p.size * 0.38, 0, 0, Math.PI * 2);
      c.fill();
      return;
    case 'block':
      c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      return;
    case 'rainbow':
      c.beginPath();
      c.arc(0, 0, p.size * (1 - t * 0.4), 0, Math.PI * 2);
      c.fill();
      return;
    case 'smoke':
      c.globalAlpha *= 0.45;
      c.beginPath();
      c.arc(0, 0, p.size * (1 + t * 1.6), 0, Math.PI * 2);
      c.fill();
      return;
    case 'flame':
      c.beginPath();
      c.arc(0, 0, p.size * (1 - t * 0.8), 0, Math.PI * 2);
      c.fill();
      return;
    case 'note':
      c.rotate(-p.r);
      noteShape(c, p.size);
      return;
    case 'spark': {
      // A streak along its flight.
      c.rotate(-p.r + Math.atan2(p.vy, p.vx));
      const len = p.size * 3 + Math.hypot(p.vx, p.vy) * 0.03;
      c.fillRect(-len, -p.size / 2, len * 2, p.size);
      return;
    }
    default:
      sparkle(c, p.size * (1 - t * 0.5));
  }
}

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const c = g;
  if (!c || !canvas) return;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);
  const next: Particle[] = [];
  for (const p of live) {
    p.age += dt;
    if (p.age >= p.life) continue;
    move(p, dt);
    const t = p.age / p.life;
    c.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    c.fillStyle = p.color;
    c.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr);
    c.rotate(p.r);
    draw(c, p, t);
    next.push(p);
  }
  live = next;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  canvas.dataset.count = String(live.length);
  raf = live.length ? requestAnimationFrame(frame) : 0;
}
