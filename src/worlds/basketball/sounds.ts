// 🏀 Basketball's sounds: a woody marimba; a right answer swishes through the net, a streak sets
// the ball on fire (a roar and a sizzle); footsteps are dribbles; a hit slams off the rim; the
// champion arrives with squeaking sneakers and a low horn (soft, never a harsh buzzer).
import { air, buildPack } from '../../audio/packs';
import { bounce, type Tone } from '../../audio/sfx';

const note = (f: number, at: number, len: number, vol: number): Tone[] => [
  { wave: 'triangle', freq: f, at, len: Math.min(Math.max(len, 0.12), 0.45), vol, attack: 0.003 },
  { wave: 'sine', freq: f * 2, at, len: 0.07, vol: vol * 0.3, attack: 0.002 }
];

const swish = (at: number, vol = 0.16): Tone => air(at, 0.24, vol, { type: 'bandpass', freq: 2500, to: 7000, q: 1.2 }, 0.05);

export const sounds = buildPack({
  note,
  touch: (at) => [swish(at)],
  streak: (at) => [air(at, 0.6, 0.1, { type: 'lowpass', freq: 400, to: 3000 }, 0.2), air(at + 0.1, 0.5, 0.03, { type: 'highpass', freq: 6000 }, 0.1)],
  step: (n) => bounce(0, n % 2 ? 0.42 : 0.36),
  impact: (at) => [...bounce(at, 0.6), { wave: 'triangle', freq: 620, at: at + 0.04, len: 0.25, vol: 0.1, attack: 0.003, vib: { rate: 30, depth: 15 } }, swish(at + 0.1, 0.1)],
  boss: () => [
    { wave: 'sine', freq: 2300, to: 2700, at: 0, len: 0.08, vol: 0.07, attack: 0.005, vib: { rate: 40, depth: 60 } },
    { wave: 'sine', freq: 2400, to: 2800, at: 0.14, len: 0.08, vol: 0.07, attack: 0.005, vib: { rate: 40, depth: 60 } },
    { wave: 'sine', freq: 196, to: 185, at: 0.3, len: 0.5, vol: 0.16, attack: 0.04 },
    { wave: 'sine', freq: 247, to: 233, at: 0.3, len: 0.5, vol: 0.1, attack: 0.04 }
  ],
  echo: { time: 0.1, feedback: 0.22, wet: 0.16 }
});
