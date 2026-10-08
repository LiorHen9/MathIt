// 🧱 Blocks' sounds: a soft chiptune square; a right answer clicks a block into place, a streak
// picks up a gem ("bling"); footsteps are blocky stomps; a hit is the pickaxe on stone with a
// crumble; the cave creature arrives in a low rumble and a growl (silly, not scary).
import { air, buildPack } from '../../audio/packs';
import { sparkle, type Tone } from '../../audio/sfx';

const note = (f: number, at: number, len: number, vol: number): Tone[] => [
  { wave: 'square', freq: f, at, len: Math.max(0.05, len * 0.8), vol: vol * 0.45, attack: 0.002, filter: { type: 'lowpass', freq: 3000 } },
  { wave: 'triangle', freq: f, at, len: Math.max(0.05, len * 0.8), vol: vol * 0.3, attack: 0.002 }
];

export const sounds = buildPack({
  note,
  touch: (at) => [{ wave: 'triangle', freq: 330, to: 220, at, len: 0.07, vol: 0.32, attack: 0.002 }, air(at, 0.03, 0.12, { type: 'bandpass', freq: 1800, q: 2 }, 0.001)],
  streak: (at) => [
    { wave: 'square', freq: 988, at, len: 0.07, vol: 0.08, attack: 0.002, filter: { type: 'lowpass', freq: 3000 } },
    { wave: 'square', freq: 1319, at: at + 0.06, len: 0.16, vol: 0.08, attack: 0.002, filter: { type: 'lowpass', freq: 3500 } },
    ...sparkle(at + 0.1, 4, 0.04, 2637)
  ],
  step: (n) => [{ wave: 'triangle', freq: n % 2 ? 130 : 120, to: 80, at: 0, len: 0.09, vol: 0.3, attack: 0.002 }, air(0, 0.05, 0.1, { type: 'lowpass', freq: 800 }, 0.002)],
  impact: (at) => [
    { wave: 'triangle', freq: 1800, to: 1500, at, len: 0.12, vol: 0.14, attack: 0.001 },
    air(at, 0.06, 0.14, { type: 'highpass', freq: 3000 }, 0.001),
    { wave: 'sine', freq: 140, to: 60, at, len: 0.12, vol: 0.4, attack: 0.002 },
    air(at + 0.05, 0.25, 0.06, { type: 'lowpass', freq: 900 }, 0.02)
  ],
  boss: () => [
    air(0, 1.0, 0.16, { type: 'lowpass', freq: 180 }, 0.2),
    { wave: 'triangle', freq: 65, to: 55, at: 0, len: 0.9, vol: 0.2, attack: 0.05, vib: { rate: 4, depth: 3 } },
    { wave: 'sine', freq: 82, to: 73, at: 0.35, len: 0.6, vol: 0.14, attack: 0.04, vib: { rate: 7, depth: 6 } }
  ],
  echo: { time: 0.14, feedback: 0.28, wet: 0.2 }
});
