// 🧚 Fairies' loop: a harp rolling through C – Am – F – G, a xylophone above it, a soft bass
// and a shaker. Slow and light.
import type { MusicLoop } from '../../audio/music';

export const loop: MusicLoop = {
  bpm: 88,
  steps: 32,
  parts: [
    { voice: 'pluck', vol: 0.2, notes: 'C5 E5 G5 E5 C6 G5 E5 G5 A4 C5 E5 C5 A5 E5 C5 E5 F4 A4 C5 A4 F5 C5 A4 C5 G4 B4 D5 B4 G5 D5 B4 D5' },
    { voice: 'marimba', vol: 0.18, notes: 'E6 . . . G6 . . . C6 . . . E6 . . . A5 . . . C6 . . . B5 . . . D6 . . .' },
    { voice: 'bass', vol: 0.28, len: 8, notes: 'C3 . . . . . . . A2 . . . . . . . F2 . . . . . . . G2 . . . . . . .' }
  ],
  drums: { shaker: '..x...x...x...x...x...x...x...x.' }
};
