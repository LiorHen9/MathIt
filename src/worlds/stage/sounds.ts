// 🎤 Stage's sounds: a bright synth; a right answer is a synth chord stab, a streak swings the
// spotlights on with claps; footsteps are dance steps (kick, hat); a hit is a power chord that
// chases a shadow away; the shadow demon swells up out of the dark.
import { air, buildPack } from '../../audio/packs';
import type { Tone } from '../../audio/sfx';

const note = (f: number, at: number, len: number, vol: number): Tone[] => [
  { wave: 'sawtooth', freq: f, at, len: Math.max(0.08, len), vol: vol * 0.5, attack: 0.008, detune: 12, filter: { type: 'lowpass', freq: 2400, to: 1000 } }
];

const clap = (at: number): Tone => air(at, 0.05, 0.12, { type: 'bandpass', freq: 1500, q: 1.2 }, 0.001);

export const sounds = buildPack({
  note,
  touch: (at) => [659, 831, 988].map((f): Tone => ({ wave: 'sawtooth', freq: f, at, len: 0.22, vol: 0.05, attack: 0.008, detune: 12, filter: { type: 'lowpass', freq: 1800, to: 900 } })),
  streak: (at) => [air(at, 0.4, 0.1, { type: 'bandpass', freq: 300, to: 3000, q: 1.2 }, 0.2), clap(at + 0.3), clap(at + 0.42), clap(at + 0.54)],
  step: (n) =>
    n % 2
      ? [{ wave: 'sine', freq: 140, to: 60, at: 0, len: 0.1, vol: 0.22, attack: 0.002 }]
      : [air(0, 0.04, 0.1, { type: 'highpass', freq: 7000 }, 0.001), { wave: 'sine', freq: 180, to: 90, at: 0, len: 0.05, vol: 0.08, attack: 0.002 }],
  impact: (at) => [
    { wave: 'sawtooth', freq: 110, at, len: 0.3, vol: 0.1, attack: 0.004, filter: { type: 'lowpass', freq: 1500 } },
    { wave: 'sawtooth', freq: 165, at, len: 0.3, vol: 0.08, attack: 0.004, filter: { type: 'lowpass', freq: 1500 } },
    air(at, 0.1, 0.12, { type: 'bandpass', freq: 2000, q: 1 }, 0.002),
    air(at + 0.1, 0.3, 0.08, { type: 'bandpass', freq: 3000, to: 400, q: 1.2 }, 0.05)
  ],
  boss: () => [
    air(0, 0.6, 0.12, { type: 'lowpass', freq: 200, to: 1200 }, 0.5),
    { wave: 'sawtooth', freq: 73, to: 69, at: 0.1, len: 0.8, vol: 0.08, attack: 0.3, vib: { rate: 5, depth: 3 }, filter: { type: 'lowpass', freq: 500 } },
    { wave: 'sine', freq: 330, to: 660, at: 0.85, len: 0.16, vol: 0.1, attack: 0.01 }
  ],
  echo: { time: 0.15, feedback: 0.3, wet: 0.22 }
});
