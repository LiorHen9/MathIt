// Sound effects, synthesised with Web Audio – no audio files to download.
// A small ZzFX-style synth: oscillators and noise, each with an envelope, a pitch slide, vibrato,
// an optional detuned twin (a fuller, chorused tone), a filter sweep, and an echo per sound.
// Every world brings a SoundPack (docs/ARCHITECTURE.md §6.3, src/worlds/<id>/sounds.ts, built
// with audio/packs.ts): the world's own tap, right answer, star, fanfare, footstep, hit, victory…
// A sound the pack lacks falls back to the shared one here. The teaching sounds (count, jump,
// ten, whoosh) are the lesson itself, so they are the same in every world and no pack replaces
// them. The `world-*` samples are each world's calling card (the picker, a tap on the hero).
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
  | 'count'
  | 'jump'
  | 'ten'
  | 'whoosh'
  // The quest map (phase 4).
  | 'step'
  | 'unlock'
  | 'locked'
  | 'chestShake'
  | 'chestOpen'
  | 'bossAppear'
  | 'hit'
  | 'dodge'
  | 'victory'
  // Coins (phase 5).
  | 'coin'
  | 'world-fairies'
  | 'world-football'
  | 'world-basketball'
  | 'world-ninja'
  | 'world-blocks'
  | 'world-stage';

/** Options some sounds take. */
export interface SfxOpts {
  /**
   * correct: the streak (the pitch climbs); star: which star (1–3); click: the key (0–9);
   * count: which item is being counted (1, 2, 3…); jump: the number landed on (0–10);
   * step: which footstep (left/right alternate); hit: which hit on the boss (1, 2, 3…);
   * coin: the coin count (a little higher every few coins).
   */
  step?: number;
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

export interface Sound {
  tones: (o: SfxOpts) => Tone[];
  /** A soft echo: delay in seconds, feedback 0..1, wet level 0..1. */
  echo?: { time: number; feedback: number; wet: number };
}

/** A struck bell: a few inharmonic partials that fade at different speeds. */
export function bell(freq: number, at: number, vol: number, len = 1.1): Tone[] {
  return [
    { wave: 'sine', freq, at, len, vol, attack: 0.004 },
    { wave: 'sine', freq: freq * 2.76, at, len: len * 0.4, vol: vol * 0.28, attack: 0.004 },
    { wave: 'sine', freq: freq * 5.4, at, len: len * 0.16, vol: vol * 0.12, attack: 0.004 }
  ];
}

/** One bounce of a ball on the floor: a low thump and a slap of noise. */
export function bounce(at: number, vol: number): Tone[] {
  return [
    { wave: 'sine', freq: 150, to: 52, at, len: 0.13, vol, attack: 0.003 },
    { wave: 'noise', at, len: 0.045, vol: vol * 0.35, attack: 0.002, filter: { type: 'lowpass', freq: 900 } }
  ];
}

/** A quick run of tiny high notes: sparkle. */
export function sparkle(at: number, notes: number, vol: number, from = 2637): Tone[] {
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

/**
 * Teaching sounds (docs/ARCHITECTURE.md §6.3): the ear helps count. Counting climbs a major
 * scale, one note per item; a hop on the number line plays the note of the number it lands on,
 * so going forward climbs and going back falls.
 */
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17];
const G4 = 392;

/** The note for counting the n-th item (1 = the first). Capped after the scale's top. */
export function countPitch(n: number): number {
  const i = Math.min(SCALE.length - 1, Math.max(0, Math.floor(n) - 1));
  return G4 * 2 ** (SCALE[i] / 12);
}

/** The note of a number on the number line (0–10). */
export function jumpPitch(n: number): number {
  const i = Math.min(SCALE.length - 1, Math.max(0, Math.floor(n)));
  return G4 * 2 ** (SCALE[i] / 12);
}

/** A hit on the boss: each one a step higher, so the ear hears the boss getting weaker. */
export function hitPitch(n: number): number {
  const i = Math.min(COMBO_STEPS.length - 1, Math.max(0, Math.floor(n) - 1));
  return 261.63 * 2 ** (COMBO_STEPS[i] / 12);
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
  // Right: a bright two-note "ta-da" that climbs with the streak and sparkles after three in a
  // row (each world's pack adds its own touch on top).
  correct: {
    tones: (o) => {
      const f = comboPitch(o.step ?? 1);
      const run = Math.min(5, Math.max(0, (o.step ?? 1) - 2));
      return [
        { wave: 'triangle', freq: f, at: 0, len: 0.14, vol: 0.34, detune: 7 },
        { wave: 'triangle', freq: f * 1.5, at: 0.075, len: 0.16, vol: 0.3, detune: 7 },
        { wave: 'sine', freq: f * 2, at: 0.15, len: 0.42, vol: 0.3 },
        ...sparkle(0.2, run, 0.06, f * 4)
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
  // Counting one item: a soft marimba-like pluck, one scale step higher for each item.
  count: {
    tones: (o) => {
      const f = countPitch(o.step ?? 1);
      return [
        { wave: 'sine', freq: f, at: 0, len: 0.28, vol: 0.32, attack: 0.004 },
        { wave: 'triangle', freq: f * 4, at: 0, len: 0.05, vol: 0.06, attack: 0.002 },
        { wave: 'sine', freq: f * 2, at: 0, len: 0.12, vol: 0.08, attack: 0.004 }
      ];
    }
  },
  // A hop on the number line: a little "boing" up, then the note of the number landed on.
  jump: {
    tones: (o) => {
      const f = jumpPitch(o.step ?? 1);
      return [
        { wave: 'sine', freq: f * 0.5, to: f, at: 0, len: 0.16, vol: 0.12, attack: 0.01 },
        { wave: 'triangle', freq: f, at: 0.18, len: 0.24, vol: 0.28, attack: 0.004 },
        { wave: 'sine', freq: f * 2, at: 0.18, len: 0.12, vol: 0.07, attack: 0.004 }
      ];
    }
  },
  // A full ten: a warm major chord rolled upwards, with a bell on top.
  ten: {
    tones: () => [
      ...[523.25, 659.25, 783.99, 1046.5].map((f, i): Tone => ({ wave: 'triangle', freq: f, at: i * 0.05, len: 0.7, vol: 0.14, attack: 0.01, detune: 6 })),
      ...bell(2093, 0.2, 0.12, 0.7)
    ],
    echo: { time: 0.13, feedback: 0.25, wet: 0.18 }
  },
  // Something flying away: a soft rush of air, rising.
  whoosh: {
    tones: () => [
      { wave: 'noise', at: 0, len: 0.32, vol: 0.22, attack: 0.1, filter: { type: 'bandpass', freq: 600, to: 3600, q: 1.6 } },
      { wave: 'sine', freq: 300, to: 900, at: 0.02, len: 0.25, vol: 0.05, attack: 0.05 }
    ]
  },
  // A footstep on the map path: a soft padded tap, left and right a little apart.
  step: {
    tones: (o) => {
      const right = (o.step ?? 0) % 2 === 1;
      return [
        { wave: 'sine', freq: right ? 210 : 180, to: 90, at: 0, len: 0.09, vol: 0.32, attack: 0.003 },
        { wave: 'noise', at: 0, len: 0.04, vol: 0.06, attack: 0.002, filter: { type: 'lowpass', freq: right ? 1300 : 1000 } }
      ];
    }
  },
  // A station opens: a magic sweep up into a bright chord, with sparkle.
  unlock: {
    tones: () => [
      { wave: 'noise', at: 0, len: 0.4, vol: 0.12, attack: 0.25, filter: { type: 'bandpass', freq: 800, to: 6000, q: 1.2 } },
      { wave: 'sine', freq: 392, to: 784, at: 0, len: 0.32, vol: 0.12, attack: 0.05 },
      ...[784, 988, 1175, 1568].map((f, i): Tone => ({ wave: 'triangle', freq: f, at: 0.3 + i * 0.06, len: 0.6, vol: 0.12, attack: 0.006, detune: 6 })),
      ...bell(1568, 0.42, 0.14, 0.8),
      ...sparkle(0.5, 5, 0.05, 3136)
    ],
    echo: { time: 0.14, feedback: 0.3, wet: 0.2 }
  },
  // A closed station: two soft knocks on a wooden door. Not an error, just "not yet".
  locked: {
    tones: () => [
      { wave: 'triangle', freq: 240, to: 180, at: 0, len: 0.07, vol: 0.3, attack: 0.002 },
      { wave: 'noise', at: 0, len: 0.03, vol: 0.08, attack: 0.001, filter: { type: 'bandpass', freq: 1200, q: 2 } },
      { wave: 'triangle', freq: 220, to: 165, at: 0.13, len: 0.08, vol: 0.28, attack: 0.002 },
      { wave: 'noise', at: 0.13, len: 0.03, vol: 0.08, attack: 0.001, filter: { type: 'bandpass', freq: 1100, q: 2 } }
    ]
  },
  // The chest rattles: quick wooden knocks and a jingle of what is inside.
  chestShake: {
    tones: () => [
      ...[0, 0.09, 0.18, 0.27].map((at, i): Tone => ({ wave: 'triangle', freq: 200 + (i % 2) * 40, to: 140, at, len: 0.06, vol: 0.28, attack: 0.002 })),
      ...[0.04, 0.13, 0.22, 0.31].map((at, i): Tone => ({ wave: 'triangle', freq: 2637 + i * 220, at, len: 0.08, vol: 0.05, attack: 0.002 }))
    ]
  },
  // The chest opens: a creaky lid, then a shining chord and a run of sparkle.
  chestOpen: {
    tones: () => [
      { wave: 'sawtooth', freq: 140, to: 260, at: 0, len: 0.28, vol: 0.05, attack: 0.03, vib: { rate: 22, depth: 18 }, filter: { type: 'lowpass', freq: 900 } },
      ...[523.25, 659.25, 783.99, 1046.5, 1318.5].map((f, i): Tone => ({ wave: 'triangle', freq: f, at: 0.26 + i * 0.05, len: 0.8, vol: 0.12, attack: 0.008, detune: 7 })),
      ...bell(2093, 0.45, 0.16, 0.9),
      ...sparkle(0.5, 7, 0.05, 2637)
    ],
    echo: { time: 0.15, feedback: 0.32, wet: 0.22 }
  },
  // The boss appears: a wobbly, more silly than scary grumble.
  bossAppear: {
    tones: () => [
      { wave: 'sawtooth', freq: 110, to: 82, at: 0, len: 0.55, vol: 0.12, attack: 0.04, vib: { rate: 9, depth: 10 }, filter: { type: 'lowpass', freq: 600 } },
      { wave: 'sine', freq: 165, to: 123, at: 0.05, len: 0.5, vol: 0.18, attack: 0.04, vib: { rate: 9, depth: 8 } },
      { wave: 'sine', freq: 330, to: 660, at: 0.55, len: 0.16, vol: 0.12, attack: 0.01 }
    ]
  },
  // A hit on the boss: a punch of air, a thump, and a bright ping a step higher every hit.
  hit: {
    tones: (o) => {
      const f = hitPitch(o.step ?? 1);
      return [
        { wave: 'noise', at: 0, len: 0.08, vol: 0.2, attack: 0.002, filter: { type: 'bandpass', freq: 1800, to: 600, q: 1 } },
        { wave: 'sine', freq: 160, to: 55, at: 0, len: 0.14, vol: 0.45, attack: 0.002 },
        { wave: 'triangle', freq: f * 2, at: 0.06, len: 0.22, vol: 0.18, attack: 0.004 },
        { wave: 'sine', freq: f * 4, at: 0.06, len: 0.12, vol: 0.06, attack: 0.004 }
      ];
    },
    echo: { time: 0.09, feedback: 0.2, wet: 0.15 }
  },
  // The boss slips aside: a quick, soft swoosh (the "not yet" is the soft wrong sound beside it).
  dodge: {
    tones: () => [
      { wave: 'noise', at: 0, len: 0.2, vol: 0.12, attack: 0.05, filter: { type: 'bandpass', freq: 2400, to: 700, q: 1.4 } },
      { wave: 'sine', freq: 520, to: 360, at: 0.02, len: 0.16, vol: 0.05, attack: 0.03 }
    ]
  },
  // The boss is beaten: a brass run up, a big held chord, a cymbal and sparkle everywhere.
  victory: {
    tones: () => {
      const brass = (freq: number, at: number, len: number, vol: number): Tone => ({
        wave: 'sawtooth',
        freq,
        at,
        len,
        vol,
        attack: 0.02,
        detune: 9,
        filter: { type: 'lowpass', freq: 1000, to: 3000, q: 1 }
      });
      return [
        { wave: 'noise', at: 0, len: 0.5, vol: 0.07, attack: 0.4, filter: { type: 'bandpass', freq: 200, q: 1.5 } },
        brass(392, 0, 0.12, 0.15),
        brass(523, 0.11, 0.12, 0.15),
        brass(659, 0.22, 0.12, 0.15),
        brass(784, 0.33, 0.12, 0.15),
        brass(523, 0.48, 1.0, 0.11),
        brass(659, 0.48, 1.0, 0.1),
        brass(784, 0.48, 1.0, 0.1),
        brass(1047, 0.48, 1.1, 0.12),
        { wave: 'noise', at: 0.48, len: 0.9, vol: 0.08, attack: 0.005, filter: { type: 'highpass', freq: 5000 } },
        ...sparkle(0.5, 8, 0.05, 2093)
      ];
    },
    echo: { time: 0.17, feedback: 0.32, wet: 0.22 }
  },
  // A coin into the purse: two quick bright notes, a step higher every five coins.
  coin: {
    tones: (o) => {
      const f = 1318.5 * 2 ** (Math.min(4, Math.floor((o.step ?? 0) / 5)) / 12);
      return [
        { wave: 'square', freq: f * 0.75, at: 0, len: 0.07, vol: 0.06, attack: 0.002, filter: { type: 'lowpass', freq: 4000 } },
        { wave: 'triangle', freq: f, at: 0.06, len: 0.22, vol: 0.2, attack: 0.002 },
        { wave: 'sine', freq: f * 2, at: 0.06, len: 0.12, vol: 0.05, attack: 0.002 }
      ];
    }
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
  // Blocks: two blocks placed (tok, tok), then a gem picked up (a quick rising "bling").
  'world-blocks': {
    tones: () => [
      { wave: 'triangle', freq: 300, to: 200, at: 0, len: 0.08, vol: 0.4, attack: 0.002 },
      { wave: 'noise', at: 0, len: 0.03, vol: 0.14, attack: 0.001, filter: { type: 'bandpass', freq: 1700, q: 2 } },
      { wave: 'triangle', freq: 360, to: 240, at: 0.17, len: 0.08, vol: 0.4, attack: 0.002 },
      { wave: 'noise', at: 0.17, len: 0.03, vol: 0.14, attack: 0.001, filter: { type: 'bandpass', freq: 1900, q: 2 } },
      { wave: 'square', freq: 988, at: 0.36, len: 0.07, vol: 0.08, attack: 0.002, filter: { type: 'lowpass', freq: 3000 } },
      { wave: 'square', freq: 1319, at: 0.42, len: 0.16, vol: 0.08, attack: 0.002, filter: { type: 'lowpass', freq: 3500 } }
    ]
  },
  // Stage: a synth chord rises, a shadow whooshes away, a sparkle.
  'world-stage': {
    tones: () => [
      ...[440, 554, 659].map((f): Tone => ({ wave: 'sawtooth', freq: f, at: 0, len: 0.45, vol: 0.07, attack: 0.03, detune: 12, filter: { type: 'lowpass', freq: 600, to: 3200, q: 2 } })),
      { wave: 'noise', at: 0.25, len: 0.35, vol: 0.12, attack: 0.05, filter: { type: 'bandpass', freq: 3000, to: 400, q: 1.2 } },
      ...sparkle(0.4, 4, 0.06, 2637)
    ],
    echo: { time: 0.15, feedback: 0.3, wet: 0.22 }
  },
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

/** Teaching sounds: the content itself, the same in every world – never from a pack. */
export const TEACHING_SOUNDS: readonly SfxName[] = ['count', 'jump', 'ten', 'whoosh'];

/** A world's sounds: any shared sound but the teaching ones and the world samples. */
export type PackSound = Exclude<SfxName, 'count' | 'jump' | 'ten' | 'whoosh' | `world-${string}`>;
export type SoundPack = Partial<Record<PackSound, Sound>>;

/** What every world's pack must have (tests/worlds/check.ts). "wrong" may stay shared: it is soft. */
export const PACK_REQUIRED: readonly PackSound[] = ['tap', 'click', 'correct', 'hint', 'star', 'fanfare', 'step', 'unlock', 'chestOpen', 'bossAppear', 'hit', 'victory', 'coin'];

let pack: SoundPack = {};
let packId = 'shared';

/** The active world's pack (worlds/index.ts applyWorld); an empty pack = the shared sounds. */
export function setSoundPack(id: string, p: SoundPack | undefined): void {
  pack = p ?? {};
  packId = p ? id : 'shared';
}

/** The sound played for a name with a pack: the pack's own, or the shared one. */
export function soundFor(name: SfxName, p: SoundPack = pack): Sound {
  if (TEACHING_SOUNDS.includes(name)) return SOUNDS[name];
  return p[name as PackSound] ?? SOUNDS[name];
}

/** Which pack the active world's sound for `name` comes from (its world id, or "shared"). */
export function soundSource(name: SfxName): string {
  return !TEACHING_SOUNDS.includes(name) && pack[name as PackSound] ? packId : 'shared';
}

/** The voices of a sound (for tests: every sound must build valid tones). With a pack: the world's. */
export function tonesFor(name: SfxName, opts: SfxOpts = {}, p: SoundPack = {}): Tone[] {
  return soundFor(name, p).tones(opts);
}

/** The shared sound's voices, for packs that build on it. */
export function sharedTones(name: SfxName, opts: SfxOpts = {}): Tone[] {
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

const unlockListeners = new Set<() => void>();

/** Run `f` once the first touch has unlocked audio (at once if it already has). */
export function onAudioUnlock(f: () => void): () => void {
  if (touched) {
    f();
    return () => {};
  }
  unlockListeners.add(f);
  return () => void unlockListeners.delete(f);
}

/** The shared AudioContext (the music uses it too); null before it can exist. */
export function audioContext(): AudioContext | null {
  return touched ? audio() : null;
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    touched = true;
    // Create (or wake) the context inside the gesture: iPhone only allows it there.
    const ac = audio();
    if (ac?.state === 'suspended') void ac.resume().catch(() => {});
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
    unlockListeners.forEach((f) => f());
    unlockListeners.clear();
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
export function noise(ac: AudioContext): AudioBuffer {
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

/** Schedule one voice at `t0` (+ its own `at`) into `out` (the music schedules its notes with it too). */
export function voice(ac: AudioContext, t: Tone, t0: number, out: AudioNode): void {
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
  if (sfxLog.length > 500) sfxLog.shift();
  const ac = audio();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume().catch(() => {});
  const sound = soundFor(name);
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
