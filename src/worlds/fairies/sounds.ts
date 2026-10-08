// 🧚 Fairies' sounds: everything rings like little bells; a right answer adds a high shimmer,
// a streak glides up a rainbow; footsteps are wing flutters; hits are magic zaps; the fog witch
// arrives in a wobbly, eerie (never scary) hum.
import { air, buildPack } from '../../audio/packs';
import { bell, sparkle, type Tone } from '../../audio/sfx';

const note = (f: number, at: number, len: number, vol: number): Tone[] => [
  { wave: 'sine', freq: f, at, len: Math.max(0.25, len * 2.2), vol, attack: 0.004 },
  ...(f * 2.76 < 11000 ? [{ wave: 'sine', freq: f * 2.76, at, len: Math.max(0.1, len * 0.7), vol: vol * 0.22, attack: 0.004 } as Tone] : [])
];

export const sounds = buildPack({
  note,
  touch: (at) => [air(at + 0.08, 0.3, 0.035, { type: 'highpass', freq: 7500 }), ...bell(2093, at + 0.1, 0.1, 0.6)],
  streak: (at) => [{ wave: 'sine', freq: 1047, to: 4186, at, len: 0.5, vol: 0.06, attack: 0.05, vib: { rate: 9, depth: 40 } }, ...sparkle(at + 0.12, 6, 0.04, 2637)],
  step: (n) => [
    { wave: 'triangle', freq: n % 2 ? 1760 : 1568, at: 0, len: 0.09, vol: 0.07, attack: 0.004 },
    air(0, 0.12, 0.03, { type: 'highpass', freq: 6000 }, 0.04)
  ],
  impact: (at) => [
    { wave: 'sine', freq: 2400, to: 600, at, len: 0.18, vol: 0.2, attack: 0.003 },
    air(at, 0.15, 0.08, { type: 'bandpass', freq: 3000, to: 800, q: 1.2 }),
    ...bell(1568, at + 0.05, 0.12, 0.5)
  ],
  boss: () => [
    { wave: 'sine', freq: 220, to: 196, at: 0, len: 0.7, vol: 0.16, attack: 0.05, vib: { rate: 6, depth: 12 } },
    { wave: 'triangle', freq: 330, to: 294, at: 0.1, len: 0.6, vol: 0.08, attack: 0.05, vib: { rate: 6, depth: 10 } },
    air(0, 0.8, 0.06, { type: 'lowpass', freq: 500 }, 0.3),
    ...bell(1175, 0.7, 0.1, 0.6)
  ],
  echo: { time: 0.16, feedback: 0.32, wet: 0.24 },
  extra: {
    dodge: { tones: () => [air(0, 0.3, 0.07, { type: 'lowpass', freq: 900, to: 400 }, 0.08), { wave: 'sine', freq: 660, to: 520, at: 0.02, len: 0.2, vol: 0.04, attack: 0.04 }] }
  }
});
