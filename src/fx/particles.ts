// A small particle system on one Canvas above the whole screen (docs/ARCHITECTURE.md §6.5):
// sparkles for a right answer or a star, confetti for the end of a round. It ignores touches,
// is hidden from screen readers, runs only while there are particles, never holds more than
// MAX_PARTICLES, and does nothing at all with reduced motion.
// Colours are the world's CSS variables, read when a burst starts.
import { reducedMotion, type Point } from './motion';

export const MAX_PARTICLES = 180;

export type ParticleKind = 'sparkle' | 'confetti';

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

function palette(): string[] {
  const css = getComputedStyle(document.documentElement);
  const out = PALETTE_VARS.map((v) => css.getPropertyValue(v).trim()).filter(Boolean);
  return out.length ? out : ['#ffb627'];
}

function ensureCanvas(): boolean {
  if (typeof document === 'undefined') return false;
  if (canvas && canvas.isConnected && g) return true;
  canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.count = '0';
  document.body.append(canvas);
  g = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  return !!g;
}

function resize(): void {
  if (!canvas) return;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
}

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

/** A burst at a screen point. `count` is a wish: the total never goes over MAX_PARTICLES. */
export function burst(at: Point, kind: ParticleKind = 'sparkle', count = 18): number {
  if (reducedMotion() || !ensureCanvas()) return 0;
  const colors = palette();
  const room = Math.max(0, MAX_PARTICLES - live.length);
  const n = Math.min(count, room);
  for (let i = 0; i < n; i++) {
    const a = kind === 'confetti' ? rand(-Math.PI * 0.85, -Math.PI * 0.15) : rand(0, Math.PI * 2);
    const speed = kind === 'confetti' ? rand(260, 620) : rand(90, 260);
    live.push({
      kind,
      x: at.x,
      y: at.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      r: rand(0, Math.PI),
      vr: rand(-9, 9),
      size: kind === 'confetti' ? rand(6, 11) : rand(3, 6.5),
      color: colors[i % colors.length],
      age: 0,
      life: kind === 'confetti' ? rand(1.3, 2.1) : rand(0.45, 0.8)
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
    if (p.kind === 'confetti') {
      p.vy += 700 * dt;
      p.vx *= 1 - 1.2 * dt;
      p.vy *= 1 - 0.6 * dt;
    } else {
      p.vx *= 1 - 3.5 * dt;
      p.vy *= 1 - 3.5 * dt;
      p.vy += 40 * dt;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.r += p.vr * dt;
    const t = p.age / p.life;
    c.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    c.fillStyle = p.color;
    c.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr);
    c.rotate(p.r);
    if (p.kind === 'confetti') {
      // A tumbling paper strip: its width wobbles as it turns.
      c.fillRect(-p.size / 2, (-p.size / 4) * Math.abs(Math.cos(p.r * 1.7)) - 1, p.size, (p.size / 2) * Math.abs(Math.cos(p.r * 1.7)) + 2);
    } else sparkle(c, p.size * (1 - t * 0.5));
    next.push(p);
  }
  live = next;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  canvas.dataset.count = String(live.length);
  raf = live.length ? requestAnimationFrame(frame) : 0;
}
