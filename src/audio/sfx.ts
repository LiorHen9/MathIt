// Sound effects, synthesised with Web Audio – no audio files to download.
// A small synth: oscillators and noise, each with an envelope, an optional pitch slide, vibrato
// and filter sweep. Phase 2 grows it into a richer ZzFX-style synth, and phase 5 gives every world
// its own SoundPack (docs/ARCHITECTURE.md §6.3); the `world-*` samples here are its first sounds.
// Games never call this directly: they emit feedback events and the Feedback Director picks the sound.
//
// Silent until the first touch: browsers block audio before it, and nobody wants an app that
// beeps on its own. On iPhone the "ambient" audio session follows the ring/silent switch.

export type SfxName = 'tap' | 'start' | 'world-fairies' | 'world-football' | 'world-basketball' | 'world-ninja';

/** One synthesised voice. Times in seconds from the start of the sound. */
interface Tone {
  /** 'noise' = white noise (shape it with `filter`). */
  wave: OscillatorType | 'noise';
  freq?: number;
  /** Frequency at the end (a slide); default = freq. */
  to?: number;
  at: number;
  len: number;
  vol: number;
  /** Fade-in time; default 12ms (a soft click-free start). */
  attack?: number;
  /** Vibrato / trill: rate in Hz, depth in Hz. */
  vib?: { rate: number; depth: number };
  /** A filter on this voice, with an optional sweep from `freq` to `to`. */
  filter?: { type: BiquadFilterType; freq: number; to?: number; q?: number };
}

/** A sampled bell: a few inharmonic partials that fade at different speeds. */
function bell(freq: number, at: number, vol: number): Tone[] {
  return [
    { wave: 'sine', freq, at, len: 1.1, vol },
    { wave: 'sine', freq: freq * 2.76, at, len: 0.45, vol: vol * 0.28 },
    { wave: 'sine', freq: freq * 5.4, at, len: 0.18, vol: vol * 0.12 }
  ];
}

/** One bounce of a ball on the floor: a low thump and a slap of noise. */
function bounce(at: number, vol: number): Tone[] {
  return [
    { wave: 'sine', freq: 150, to: 52, at, len: 0.13, vol, attack: 0.003 },
    { wave: 'noise', at, len: 0.045, vol: vol * 0.35, attack: 0.002, filter: { type: 'lowpass', freq: 900 } }
  ];
}

const SOUNDS: Record<SfxName, Tone[]> = {
  // A soft wooden click.
  tap: [{ wave: 'triangle', freq: 660, to: 520, at: 0, len: 0.06, vol: 0.35 }],
  // A bright rising chime: C – E – G – C, with a sparkle on top.
  start: [
    { wave: 'triangle', freq: 523, at: 0, len: 0.16, vol: 0.32 },
    { wave: 'triangle', freq: 659, at: 0.09, len: 0.16, vol: 0.32 },
    { wave: 'triangle', freq: 784, at: 0.18, len: 0.18, vol: 0.32 },
    { wave: 'sine', freq: 1047, at: 0.27, len: 0.42, vol: 0.34 },
    { wave: 'sine', freq: 2093, to: 2637, at: 0.3, len: 0.3, vol: 0.08 }
  ],
  // Fairies: two magic bells and a sparkle running up.
  'world-fairies': [
    ...bell(1568, 0, 0.3),
    ...bell(2093, 0.16, 0.22),
    ...[2637, 3136, 3520, 4186, 4699].map((f, i): Tone => ({ wave: 'triangle', freq: f, at: 0.05 + i * 0.055, len: 0.12, vol: 0.07 })),
    { wave: 'noise', at: 0.05, len: 0.35, vol: 0.04, filter: { type: 'highpass', freq: 7000 } }
  ],
  // Football: a referee's whistle, short – long (a pea whistle trills, hence the vibrato).
  'world-football': [
    { wave: 'sine', freq: 2750, at: 0, len: 0.16, vol: 0.32, attack: 0.008, vib: { rate: 32, depth: 140 } },
    { wave: 'noise', at: 0, len: 0.16, vol: 0.05, filter: { type: 'bandpass', freq: 2800, q: 3 } },
    { wave: 'sine', freq: 2750, at: 0.24, len: 0.42, vol: 0.32, attack: 0.008, vib: { rate: 32, depth: 140 } },
    { wave: 'noise', at: 0.24, len: 0.42, vol: 0.05, filter: { type: 'bandpass', freq: 2800, q: 3 } }
  ],
  // Basketball: three dribbles, getting quicker.
  'world-basketball': [...bounce(0, 0.7), ...bounce(0.27, 0.62), ...bounce(0.48, 0.55)],
  // Ninja: a "shush" through the air, then the star hits wood.
  'world-ninja': [
    { wave: 'noise', at: 0, len: 0.3, vol: 0.55, attack: 0.14, filter: { type: 'bandpass', freq: 500, to: 4200, q: 1.4 } },
    { wave: 'triangle', freq: 980, to: 320, at: 0.28, len: 0.07, vol: 0.3, attack: 0.002 },
    { wave: 'noise', at: 0.28, len: 0.05, vol: 0.18, attack: 0.002, filter: { type: 'bandpass', freq: 1800, q: 2 } }
  ]
};

export const SFX_NAMES = Object.keys(SOUNDS) as SfxName[];

let enabled = true;
let volume = 0.8;
let touched = false;
let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;
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

/** One second of white noise, made once and reused by every noise voice. */
function noise(ac: AudioContext): AudioBuffer {
  if (noiseBuf) return noiseBuf;
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  return buf;
}

function voice(ac: AudioContext, t: Tone, t0: number, out: AudioNode): void {
  const start = t0 + t.at;
  const end = start + t.len;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(t.vol, start + (t.attack ?? 0.012));
  g.gain.exponentialRampToValueAtTime(0.0001, end);

  let src: AudioScheduledSourceNode;
  if (t.wave === 'noise') {
    const n = ac.createBufferSource();
    n.buffer = noise(ac);
    n.loop = true;
    src = n;
  } else {
    const osc = ac.createOscillator();
    osc.type = t.wave;
    const f = t.freq ?? 440;
    osc.frequency.setValueAtTime(f, start);
    if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, end);
    if (t.vib) {
      const lfo = ac.createOscillator();
      const depth = ac.createGain();
      lfo.frequency.value = t.vib.rate;
      depth.gain.value = t.vib.depth;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(start);
      lfo.stop(end + 0.02);
    }
    src = osc;
  }

  let node: AudioNode = src;
  if (t.filter) {
    const f = ac.createBiquadFilter();
    f.type = t.filter.type;
    f.Q.value = t.filter.q ?? 0.8;
    f.frequency.setValueAtTime(t.filter.freq, start);
    if (t.filter.to) f.frequency.exponentialRampToValueAtTime(t.filter.to, end);
    node = node.connect(f);
  }
  node.connect(g).connect(out);
  src.start(start);
  src.stop(end + 0.02);
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
  for (const t of SOUNDS[name]) voice(ac, t, t0, master);
}
