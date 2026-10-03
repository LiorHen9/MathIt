// Sound effects, synthesised with Web Audio – no audio files to download.
// Phase 0: the audio engine (first-touch unlock, iPhone silent switch, volume, test log) and the
// first sounds. Phase 2 grows this into a richer ZzFX-style synth, and phase 5 gives every world
// its own SoundPack (docs/ARCHITECTURE.md §6.3). Games never call this directly: they emit
// feedback events and the Feedback Director picks the sound.
//
// Silent until the first touch: browsers block audio before it, and nobody wants an app that
// beeps on its own. On iPhone the "ambient" audio session follows the ring/silent switch.

export type SfxName = 'tap' | 'start';

/** One synthesised tone. Times in seconds from the start of the sound. */
interface Tone {
  freq: number;
  /** Frequency at the end (a slide); default = freq. */
  to?: number;
  at: number;
  len: number;
  vol: number;
  wave: OscillatorType;
}

const SOUNDS: Record<SfxName, Tone[]> = {
  // A soft wooden click.
  tap: [{ freq: 660, to: 520, at: 0, len: 0.06, vol: 0.35, wave: 'triangle' }],
  // A bright rising chime: C – E – G – C, with a sparkle on top.
  start: [
    { freq: 523, at: 0, len: 0.16, vol: 0.32, wave: 'triangle' },
    { freq: 659, at: 0.09, len: 0.16, vol: 0.32, wave: 'triangle' },
    { freq: 784, at: 0.18, len: 0.18, vol: 0.32, wave: 'triangle' },
    { freq: 1047, at: 0.27, len: 0.42, vol: 0.34, wave: 'sine' },
    { freq: 2093, to: 2637, at: 0.3, len: 0.3, vol: 0.08, wave: 'sine' }
  ]
};

let enabled = true;
let volume = 0.8;
let touched = false;
let ctx: AudioContext | null = null;
/** For tests: every sound that was asked for while enabled and unlocked, in order. */
export const sfxLog: SfxName[] = [];

export function setSfxEnabled(on: boolean): void {
  enabled = on;
}

/** 0..1 */
export function setSfxVolume(v: number): void {
  volume = Math.min(1, Math.max(0, v));
}

/** True after the first touch or key press (browsers allow sound only after one). */
export function audioUnlocked(): boolean {
  return touched;
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    touched = true;
    // Create (or wake) the context inside the gesture: iPhone only allows it there.
    const ac = audio();
    if (ac?.state === 'suspended') void ac.resume().catch(() => {});
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  (window as unknown as { __mathitSounds: SfxName[] }).__mathitSounds = sfxLog;
}

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    // Safari 16.4+: "ambient" mixes with other audio and respects the ring/silent switch.
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'ambient';
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function playSfx(name: SfxName): void {
  if (!enabled || !touched || volume === 0) return;
  sfxLog.push(name);
  if (sfxLog.length > 60) sfxLog.shift();
  const ac = audio();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume().catch(() => {});
  const t0 = ac.currentTime + 0.01;
  const master = ac.createGain();
  master.gain.value = 0.3 * volume;
  master.connect(ac.destination);
  for (const t of SOUNDS[name]) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = t.wave;
    osc.frequency.setValueAtTime(t.freq, t0 + t.at);
    if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, t0 + t.at + t.len);
    g.gain.setValueAtTime(0.0001, t0 + t.at);
    g.gain.exponentialRampToValueAtTime(t.vol, t0 + t.at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t.at + t.len);
    osc.connect(g).connect(master);
    osc.start(t0 + t.at);
    osc.stop(t0 + t.at + t.len + 0.02);
  }
}
