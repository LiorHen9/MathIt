// 🥷 Ninja's sounds: a plucked koto; a right answer rings like a blade, a streak vanishes in a
// puff of smoke; footsteps are soft and silent-ish; a hit is a star whooshing into wood; the
// shadow master arrives on taiko drums and a gong.
import { air, buildPack } from '../../audio/packs';
import type { Tone } from '../../audio/sfx';

const note = (f: number, at: number, len: number, vol: number): Tone[] => [
  { wave: 'triangle', freq: f, to: f * 0.99, at, len: Math.min(Math.max(len, 0.12), 0.4), vol, attack: 0.002 },
  air(at, 0.02, vol * 0.2, { type: 'bandpass', freq: 3000, q: 2 }, 0.001)
];

const taiko = (at: number, vol = 0.5): Tone[] => [{ wave: 'sine', freq: 110, to: 60, at, len: 0.3, vol, attack: 0.003 }, air(at, 0.05, 0.12, { type: 'lowpass', freq: 600 }, 0.002)];

export const sounds = buildPack({
  note,
  touch: (at) => [
    { wave: 'triangle', freq: 2900, to: 2500, at, len: 0.3, vol: 0.1, attack: 0.003, vib: { rate: 38, depth: 60 } },
    air(at, 0.07, 0.1, { type: 'bandpass', freq: 5200, q: 3 }, 0.002)
  ],
  streak: (at) => [air(at, 0.6, 0.1, { type: 'lowpass', freq: 600, to: 200 }, 0.05), air(at, 0.3, 0.08, { type: 'bandpass', freq: 600, to: 3000, q: 1.4 }, 0.1)],
  step: (n) => [air(0, 0.05, 0.07, { type: 'lowpass', freq: n % 2 ? 700 : 600 }, 0.004), { wave: 'sine', freq: 120, to: 70, at: 0, len: 0.06, vol: 0.12, attack: 0.003 }],
  impact: (at) => [
    air(at, 0.2, 0.3, { type: 'bandpass', freq: 500, to: 4200, q: 1.4 }, 0.1),
    { wave: 'triangle', freq: 980, to: 320, at: at + 0.18, len: 0.07, vol: 0.3, attack: 0.002 },
    air(at + 0.18, 0.05, 0.18, { type: 'bandpass', freq: 1800, q: 2 }, 0.002)
  ],
  boss: () => [
    ...taiko(0),
    ...taiko(0.22),
    { wave: 'sine', freq: 98, at: 0.45, len: 2.2, vol: 0.25, attack: 0.005 },
    { wave: 'sine', freq: 235, at: 0.45, len: 1.2, vol: 0.08, attack: 0.005 },
    { wave: 'sine', freq: 382, at: 0.45, len: 0.6, vol: 0.05, attack: 0.005 }
  ],
  echo: { time: 0.18, feedback: 0.3, wet: 0.2 }
});
