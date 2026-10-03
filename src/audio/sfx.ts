// Sound effects, synthesised with Web Audio – no audio files to download.
// A small ZzFX-style synth: oscillators and noise, each with an envelope, a pitch slide, vibrato,
// an optional detuned twin (a fuller, chorused tone), a filter sweep, and an echo per sound.
// Phase 5 gives every world its own SoundPack (docs/ARCHITECTURE.md §6.3); for now the shared
// sounds take a "flavor" from the world (fairies → a bell, football → a kick, basketball → a
// swish, ninja → a blade) and the `world-*` samples are each world's calling card.
// Games never call this directly: they emit feedback events and the Feedback Director
// (fx/director.ts) picks the sound.
//
// Silent until the first touch: browsers block audio before it, and nobody wants an app that
// beeps on its own. On iPhone the "ambient" audio session follows the ring/silent switch.

export type SfxName =
  | 'tap'
  | 'start'
  | 'click'
  | 'correct'
  | 'wrong'
  | 'hint'
  | 'star'
  | 'fanfare'
  | 'world-fairies'
  | 'world-football'
  | 'world-basketball'
  | 'world-ninja';

/** Options some sounds take. */
export interface SfxOpts {
  /** correct: the streak (the pitch climbs); star: which star (1–3); click: the key (0–9). */
  step?: number;
  /** A world id: the shared sounds take its colour. */
  flavor?: string;
}

/** One synthesised voice. Times in seconds from the start of the sound. */
export interface Tone {
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
  /** A second oscillator this many cents away, for a fuller tone. */
  detune?: number;
  /** A filter on this voice, with an optional sweep from `freq` to `to`. */
  filter?: { type: BiquadFilterType; freq: number; to?: number; q?: number };
}

interface Sound {
  tones: (o: SfxOpts) => Tone[];
  /** A soft echo: delay in seconds, feedback 0..1, wet level 0..1. */
  echo?: { time: number; feedback: number; wet: number };
}

/** A struck bell: a few inharmonic partials that fade at different speeds. */
function bell(freq: number, at: number, vol: number, len = 1.1): Tone[] {
  return [
    { wave: 'sine', freq, at, len, vol, attack: 0.004 },
    { wave: 'sine', freq: freq * 2.76, at, len: len * 0.4, vol: vol * 0.28, attack: 0.004 },
    { wave: 'sine', freq: freq * 5.4, at, len: len * 0.16, vol: vol * 0.12, attack: 0.004 }
  ];
}

/** One bounce of a ball on the floor: a low thump and a slap of noise. */
function bounce(at: number, vol: number): Tone[] {
  return [
    { wave: 'sine', freq: 150, to: 52, at, len: 0.13, vol, attack: 0.003 },
    { wave: 'noise', at, len: 0.045, vol: vol * 0.35, attack: 0.002, filter: { type: 'lowpass', freq: 900 } }
  ];
}

/** A quick run of tiny high notes: sparkle. */
function sparkle(at: number, notes: number, vol: number, from = 2637): Tone[] {
  const out: Tone[] = [];
  for (let i = 0; i < notes; i++) {
    out.push({ wave: 'triangle', freq: from * 2 ** ((i * 3) / 12), at: at + i * 0.045, len: 0.11, vol, attack: 0.003 });
  }
  return out;
}

/** Major-scale steps (semitones) for the combo: every right answer in a row climbs one step. */
const COMBO_STEPS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
const C5 = 523.25;

/** The base pitch of "correct" for a streak (1 = the first right answer). Capped after ten. */
export function comboPitch(streak: number): number {
  const i = Math.min(COMBO_STEPS.length - 1, Math.max(0, Math.floor(streak) - 1));
  return C5 * 2 ** (COMBO_STEPS[i] / 12);
}

/** Star notes: each star one step higher (C6, E6, G6, then C7). */
export function starPitch(n: number): number {
  const steps = [0, 4, 7, 12];
  return 1046.5 * 2 ** (steps[Math.min(steps.length - 1, Math.max(0, n - 1))] / 12);
}

/** The world's touch on a right answer. */
function correctFlavor(flavor: string | undefined, f: number): Tone[] {
  switch (flavor) {
    case 'fairies':
      return [...bell(f * 2, 0.1, 0.16, 0.8), { wave: 'noise', at: 0.08, len: 0.3, vol: 0.035, filter: { type: 'highpass', freq: 7500 } }];
    case 'football':
      // A kick, then the crowd goes "ooh".
      return [
        { wave: 'sine', freq: 140, to: 48, at: 0, len: 0.12, vol: 0.5, attack: 0.002 },
        { wave: 'noise', at: 0, len: 0.04, vol: 0.12, attack: 0.002, filter: { type: 'lowpass', freq: 1400 } },
        { wave: 'noise', at: 0.08, len: 0.5, vol: 0.06, attack: 0.18, filter: { type: 'bandpass', freq: 900, to: 1300, q: 0.7 } }
      ];
    case 'basketball':
      // Through the net: a swish.
      return [{ wave: 'noise', at: 0, len: 0.24, vol: 0.16, attack: 0.05, filter: { type: 'bandpass', freq: 2500, to: 7000, q: 1.2 } }];
    case 'ninja':
      // A blade: a bright metallic ring with a shiver.
      return [
        { wave: 'triangle', freq: 2900, to: 2500, at: 0, len: 0.3, vol: 0.1, attack: 0.003, vib: { rate: 38, depth: 60 } },
        { wave: 'noise', at: 0, len: 0.07, vol: 0.1, attack: 0.002, filter: { type: 'bandpass', freq: 5200, q: 3 } }
      ];
    default:
      return [];
  }
}

const SOUNDS: Record<SfxName, Sound> = {
  // A soft wooden click.
  tap: { tones: () => [{ wave: 'triangle', freq: 660, to: 520, at: 0, len: 0.06, vol: 0.35 }] },
  // A bright rising chime: C – E – G – C, with a sparkle on top.
  start: {
    tones: () => [
      { wave: 'triangle', freq: 523, at: 0, len: 0.16, vol: 0.32 },
      { wave: 'triangle', freq: 659, at: 0.09, len: 0.16, vol: 0.32 },
      { wave: 'triangle', freq: 784, at: 0.18, len: 0.18, vol: 0.32 },
      { wave: 'sine', freq: 1047, at: 0.27, len: 0.42, vol: 0.34 },
      { wave: 'sine', freq: 2093, to: 2637, at: 0.3, len: 0.3, vol: 0.08 }
    ]
  },
  // A number-pad key: a short wooden tick, a little higher for bigger digits.
  click: {
    tones: (o) => [
      { wave: 'triangle', freq: 820 + (o.step ?? 5) * 28, to: 640, at: 0, len: 0.045, vol: 0.3, attack: 0.002 },
      { wave: 'noise', at: 0, len: 0.02, vol: 0.05, attack: 0.001, filter: { type: 'highpass', freq: 3000 } }
    ]
  },
  // Right: a bright two-note "ta-da" that climbs with the streak, sparkles after three in a row,
  // and the world's own touch.
  correct: {
    tones: (o) => {
      const f = comboPitch(o.step ?? 1);
      const run = Math.min(5, Math.max(0, (o.step ?? 1) - 2));
      return [
        { wave: 'triangle', freq: f, at: 0, len: 0.14, vol: 0.34, detune: 7 },
        { wave: 'triangle', freq: f * 1.5, at: 0.075, len: 0.16, vol: 0.3, detune: 7 },
        { wave: 'sine', freq: f * 2, at: 0.15, len: 0.42, vol: 0.3 },
        ...sparkle(0.2, run, 0.06, f * 4),
        ...correctFlavor(o.flavor, f)
      ];
    },
    echo: { time: 0.11, feedback: 0.25, wet: 0.18 }
  },
  // Not yet: soft and low, two notes going gently down. No buzzer, nothing harsh.
  wrong: {
    tones: () => [
      { wave: 'sine', freq: 392, to: 370, at: 0, len: 0.17, vol: 0.26, attack: 0.02, filter: { type: 'lowpass', freq: 1200 } },
      { wave: 'sine', freq: 330, to: 294, at: 0.16, len: 0.3, vol: 0.24, attack: 0.02, filter: { type: 'lowpass', freq: 1000 } },
      { wave: 'triangle', freq: 165, at: 0.16, len: 0.26, vol: 0.08, attack: 0.03 }
    ]
  },
  // A hint: a curious rising "hmm?" with a little wobble.
  hint: {
    tones: () => [
      { wave: 'sine', freq: 587, at: 0, len: 0.16, vol: 0.22 },
      { wave: 'sine', freq: 784, to: 830, at: 0.13, len: 0.36, vol: 0.22, vib: { rate: 7, depth: 9 } },
      { wave: 'triangle', freq: 1568, at: 0.13, len: 0.12, vol: 0.04 }
    ],
    echo: { time: 0.14, feedback: 0.2, wet: 0.15 }
  },
  // One star: a bell, one step higher for each star, with a sparkle.
  star: {
    tones: (o) => {
      const f = starPitch(o.step ?? 1);
      return [...bell(f, 0, 0.3, 0.9), { wave: 'triangle', freq: f, at: 0, len: 0.12, vol: 0.12 }, ...sparkle(0.05, 3 + Math.min(3, o.step ?? 1), 0.05, f * 2)];
    },
    echo: { time: 0.13, feedback: 0.3, wet: 0.2 }
  },
  // The end of a round: a brassy C – E – G and a held chord, with sparkle and a drum roll.
  fanfare: {
    tones: () => {
      const brass = (freq: number, at: number, len: number, vol: number): Tone => ({
        wave: 'sawtooth',
        freq,
        at,
        len,
        vol,
        attack: 0.02,
        detune: 9,
        filter: { type: 'lowpass', freq: 900, to: 2600, q: 1 }
      });
      return [
        { wave: 'noise', at: 0, len: 0.34, vol: 0.06, attack: 0.25, filter: { type: 'bandpass', freq: 220, q: 1.5 } },
        brass(523, 0.0, 0.13, 0.16),
        brass(659, 0.13, 0.13, 0.16),
        brass(784, 0.26, 0.13, 0.16),
        brass(523, 0.4, 0.75, 0.12),
        brass(659, 0.4, 0.75, 0.11),
        brass(784, 0.4, 0.75, 0.11),
        brass(1047, 0.4, 0.8, 0.12),
        ...sparkle(0.42, 6, 0.05, 2093)
      ];
    },
    echo: { time: 0.16, feedback: 0.3, wet: 0.2 }
  },
  // Fairies: two magic bells and a sparkle running up.
  'world-fairies': {
    tones: () => [
      ...bell(1568, 0, 0.3),
      ...bell(2093, 0.16, 0.22),
      ...[2637, 3136, 3520, 4186, 4699].map((f, i): Tone => ({ wave: 'triangle', freq: f, at: 0.05 + i * 0.055, len: 0.12, vol: 0.07 })),
      { wave: 'noise', at: 0.05, len: 0.35, vol: 0.04, filter: { type: 'highpass', freq: 7000 } }
    ]
  },
  // Football: a referee's whistle, short – long (a pea whistle trills, hence the vibrato).
  'world-football': {
    tones: () => [
      { wave: 'sine', freq: 2750, at: 0, len: 0.16, vol: 0.32, attack: 0.008, vib: { rate: 32, depth: 140 } },
      { wave: 'noise', at: 0, len: 0.16, vol: 0.05, filter: { type: 'bandpass', freq: 2800, q: 3 } },
      { wave: 'sine', freq: 2750, at: 0.24, len: 0.42, vol: 0.32, attack: 0.008, vib: { rate: 32, depth: 140 } },
      { wave: 'noise', at: 0.24, len: 0.42, vol: 0.05, filter: { type: 'bandpass', freq: 2800, q: 3 } }
    ]
  },
  // Basketball: three dribbles, getting quicker.
  'world-basketball': { tones: () => [...bounce(0, 0.7), ...bounce(0.27, 0.62), ...bounce(0.48, 0.55)] },
  // Ninja: a "shush" through the air, then the star hits wood.
  'world-ninja': {
    tones: () => [
      { wave: 'noise', at: 0, len: 0.3, vol: 0.55, attack: 0.14, filter: { type: 'bandpass', freq: 500, to: 4200, q: 1.4 } },
      { wave: 'triangle', freq: 980, to: 320, at: 0.28, len: 0.07, vol: 0.3, attack: 0.002 },
      { wave: 'noise', at: 0.28, len: 0.05, vol: 0.18, attack: 0.002, filter: { type: 'bandpass', freq: 1800, q: 2 } }
    ]
  }
};

export const SFX_NAMES = Object.keys(SOUNDS) as SfxName[];

/** The voices of a sound (for tests: every sound must build valid tones). */
export function tonesFor(name: SfxName, opts: SfxOpts = {}): Tone[] {
  return SOUNDS[name].tones(opts);
}

let enabled = true;
let volume = 0.8;
let touched = false;
let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;
/** Sounds still ringing, so a skipped celebration can be hushed. */
const ringing = new Set<GainNode>();
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

function oscillator(ac: AudioContext, t: Tone, start: number, end: number, cents = 0): OscillatorNode {
  const osc = ac.createOscillator();
  osc.type = t.wave as OscillatorType;
  osc.detune.value = cents;
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
  return osc;
}

function voice(ac: AudioContext, t: Tone, t0: number, out: AudioNode): void {
  const start = t0 + t.at;
  const end = start + t.len;
  const g = ac.createGain();
  const peak = t.detune ? t.vol * 0.6 : t.vol;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + Math.min(t.attack ?? 0.012, t.len * 0.8));
  g.gain.exponentialRampToValueAtTime(0.0001, end);

  const sources: AudioScheduledSourceNode[] = [];
  if (t.wave === 'noise') {
    const n = ac.createBufferSource();
    n.buffer = noise(ac);
    n.loop = true;
    sources.push(n);
  } else {
    sources.push(oscillator(ac, t, start, end));
    if (t.detune) sources.push(oscillator(ac, t, start, end, t.detune));
  }

  let into: AudioNode = g;
  if (t.filter) {
    const f = ac.createBiquadFilter();
    f.type = t.filter.type;
    f.Q.value = t.filter.q ?? 0.8;
    f.frequency.setValueAtTime(t.filter.freq, start);
    if (t.filter.to) f.frequency.exponentialRampToValueAtTime(t.filter.to, end);
    f.connect(g);
    into = f;
  }
  g.connect(out);
  for (const s of sources) {
    s.connect(into);
    s.start(start);
    s.stop(end + 0.02);
  }
}

export function playSfx(name: SfxName, opts: SfxOpts = {}): void {
  if (!enabled || !touched || volume === 0) return;
  sfxLog.push(name);
  if (sfxLog.length > 80) sfxLog.shift();
  const ac = audio();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume().catch(() => {});
  const sound = SOUNDS[name];
  const tones = sound.tones(opts);
  const t0 = ac.currentTime + 0.01;
  const length = Math.max(...tones.map((t) => t.at + t.len));
  const master = ac.createGain();
  master.gain.value = 0.3 * volume;
  master.connect(ac.destination);
  const nodes: AudioNode[] = [master];
  let tail = 0.1;
  if (sound.echo) {
    // master → delay ⟲ feedback, delay → wet → out. Hushing the master hushes the echo's input too.
    const delay = ac.createDelay(1);
    const fb = ac.createGain();
    const wet = ac.createGain();
    delay.delayTime.value = sound.echo.time;
    fb.gain.value = sound.echo.feedback;
    wet.gain.value = sound.echo.wet;
    master.connect(delay);
    delay.connect(fb).connect(delay);
    delay.connect(wet).connect(ac.destination);
    nodes.push(delay, fb, wet);
    tail = sound.echo.time * 8;
  }
  ringing.add(master);
  // Cut the graph when the sound is over (the echo loop would otherwise live forever).
  setTimeout(
    () => {
      ringing.delete(master);
      for (const n of nodes) {
        try {
          n.disconnect();
        } catch {
          /* already gone */
        }
      }
    },
    (length + tail) * 1000 + 100
  );
  for (const t of tones) voice(ac, t, t0, master);
}

/** Fade out every sound still ringing (a skipped celebration). */
export function hushSfx(): void {
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const g of ringing) {
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + 0.08);
  }
  ringing.clear();
}
