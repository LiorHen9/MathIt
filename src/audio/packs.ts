// Building a world's SoundPack (docs/ARCHITECTURE.md §6.3) from a few strokes of its style:
// the world's instrument (one note), its touch on a right answer (a kick, a swish, a blade…),
// what a streak adds (the crowd, the ball on fire), a footstep, a hit on the boss and the boss's
// entrance. Every sound the director asks for is then the world's own, with the same shape as
// the shared one: the right answer still climbs with the streak, a star with its number, a hit
// with every hit. Loaded with the worlds (not in the first load).
import { comboPitch, hitPitch, sparkle, starPitch, type Sound, type SoundPack, type Tone } from './sfx';

export interface PackStyle {
  /** The world's instrument: one note. Its first voice must sound `freq` (the climbing pitch). */
  note: (freq: number, at: number, len: number, vol: number) => Tone[];
  /** The world's touch on a right answer, from `at`. */
  touch: (at: number) => Tone[];
  /** Added from three right answers in a row (and to the victory). */
  streak: (at: number) => Tone[];
  /** One footstep on the map (`n` alternates left and right). */
  step: (n: number) => Tone[];
  /** The impact of a hit on the boss, from `at` (a climbing note is added). */
  impact: (at: number) => Tone[];
  /** The boss shows up. */
  boss: () => Tone[];
  echo?: Sound['echo'];
  /** Sounds of its own beyond these (a softer "wrong", a dodge…). */
  extra?: SoundPack;
}

const notes = (s: PackStyle, fs: number[], at: number, gap: number, len: number, vol: number): Tone[] => fs.flatMap((f, i) => s.note(f, at + i * gap, len, vol));

export function buildPack(s: PackStyle): SoundPack {
  const echo = s.echo;
  return {
    tap: { tones: () => s.note(880, 0, 0.07, 0.22) },
    click: { tones: (o) => s.note(700 + (o.step ?? 5) * 30, 0, 0.06, 0.2) },
    correct: {
      tones: (o) => {
        const n = o.step ?? 1;
        const f = comboPitch(n);
        return [
          ...s.note(f, 0, 0.14, 0.3),
          ...s.note(f * 1.5, 0.075, 0.16, 0.26),
          ...s.note(f * 2, 0.15, 0.4, 0.24),
          ...sparkle(0.2, Math.min(5, Math.max(0, n - 2)), 0.05, Math.min(4000, f * 4)),
          ...s.touch(0),
          ...(n >= 3 ? s.streak(0.18) : [])
        ];
      },
      echo
    },
    hint: { tones: () => [...s.note(587, 0, 0.16, 0.2), ...s.note(784, 0.13, 0.34, 0.2)], echo },
    star: {
      tones: (o) => {
        const f = starPitch(o.step ?? 1);
        return [...s.note(f, 0, 0.6, 0.28), ...sparkle(0.05, 3 + Math.min(3, o.step ?? 1), 0.05, f * 2)];
      },
      echo
    },
    fanfare: {
      tones: () => [...notes(s, [523, 659, 784], 0, 0.13, 0.14, 0.2), ...notes(s, [523, 659, 784, 1047], 0.4, 0, 0.8, 0.13), ...s.touch(0.4), ...sparkle(0.42, 6, 0.05, 2093)],
      echo
    },
    step: { tones: (o) => s.step(o.step ?? 0) },
    unlock: { tones: () => [...notes(s, [784, 988, 1175, 1568], 0.12, 0.06, 0.6, 0.13), ...s.touch(0), ...sparkle(0.42, 5, 0.05, 3136)], echo },
    chestOpen: { tones: () => [...notes(s, [523.25, 659.25, 783.99, 1046.5, 1318.5], 0.22, 0.05, 0.75, 0.12), ...s.touch(0), ...sparkle(0.5, 7, 0.05, 2637)], echo },
    bossAppear: { tones: s.boss },
    hit: {
      tones: (o) => {
        const f = hitPitch(o.step ?? 1);
        return [...s.impact(0), ...s.note(f * 2, 0.06, 0.22, 0.2)];
      },
      echo
    },
    victory: {
      tones: () => [...notes(s, [392, 523, 659, 784], 0, 0.11, 0.13, 0.2), ...notes(s, [523, 659, 784, 1047], 0.48, 0, 1.0, 0.13), ...s.touch(0.48), ...s.streak(0.55), ...sparkle(0.5, 8, 0.05, 2093)],
      echo
    },
    coin: {
      tones: (o) => {
        const f = 1318.5 * 2 ** (Math.min(4, Math.floor((o.step ?? 0) / 5)) / 12);
        return [...s.note(f * 0.75, 0, 0.07, 0.12), ...s.note(f, 0.06, 0.22, 0.2)];
      }
    },
    ...s.extra
  };
}

/** White noise through a filter: air, a crowd, a swish, smoke. */
export function air(at: number, len: number, vol: number, filter: Tone['filter'], attack = 0.02): Tone {
  return { wave: 'noise', at, len, vol, attack, filter };
}
