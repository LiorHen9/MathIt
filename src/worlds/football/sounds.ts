// ⚽ Football's sounds: stadium brass; a right answer is a kick that hits the net, a streak
// brings the crowd to its feet with the whistle; footsteps are studs on grass; a hit is a hard
// shot and the crowd's "ooh"; the giant goalkeeper walks in on low brass.
import { air, buildPack } from '../../audio/packs';
import type { Tone } from '../../audio/sfx';

const note = (f: number, at: number, len: number, vol: number): Tone[] => [
  { wave: 'sawtooth', freq: f, at, len, vol: vol * 0.6, attack: 0.02, detune: 9, filter: { type: 'lowpass', freq: 1400, to: 2400 } },
  { wave: 'sine', freq: f, at, len, vol: vol * 0.3, attack: 0.01 }
];

const kick = (at: number, vol = 0.5): Tone[] => [
  { wave: 'sine', freq: 140, to: 48, at, len: 0.12, vol, attack: 0.002 },
  air(at, 0.04, 0.12, { type: 'lowpass', freq: 1400 }, 0.002)
];

export const sounds = buildPack({
  note,
  touch: (at) => [...kick(at), air(at + 0.09, 0.22, 0.07, { type: 'bandpass', freq: 3000, to: 6000, q: 1 }, 0.03)],
  streak: (at) => [
    air(at, 0.95, 0.09, { type: 'bandpass', freq: 900, to: 1400, q: 0.6 }, 0.2),
    air(at + 0.05, 0.8, 0.05, { type: 'bandpass', freq: 1900, q: 0.8 }, 0.25),
    { wave: 'sine', freq: 2750, at, len: 0.14, vol: 0.1, attack: 0.008, vib: { rate: 32, depth: 140 } }
  ],
  step: (n) => [air(0, 0.05, 0.1, { type: 'lowpass', freq: 1100 }, 0.003), { wave: 'sine', freq: n % 2 ? 190 : 160, to: 80, at: 0, len: 0.08, vol: 0.22, attack: 0.003 }],
  impact: (at) => [...kick(at, 0.55), air(at, 0.06, 0.2, { type: 'bandpass', freq: 1400, q: 1 }, 0.002), air(at + 0.05, 0.45, 0.05, { type: 'bandpass', freq: 700, q: 0.8 }, 0.1)],
  boss: () => [
    ...note(98, 0, 0.2, 0.3),
    ...note(98, 0.25, 0.2, 0.3),
    ...note(87, 0.5, 0.55, 0.32),
    air(0, 1.0, 0.05, { type: 'bandpass', freq: 500, q: 0.7 }, 0.3)
  ],
  echo: { time: 0.12, feedback: 0.25, wet: 0.18 }
});
