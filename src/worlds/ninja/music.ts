// 🥷 Ninja's loop: taiko drums and a breathy flute over a plucked koto, in a pentatonic scale.
import type { MusicLoop } from '../../audio/music';

export const loop: MusicLoop = {
  bpm: 100,
  steps: 32,
  parts: [
    { voice: 'flute', vol: 0.16, len: 2, notes: 'A4 . . . C5 . D5 . E5 . . . D5 . C5 . A4 . . . G4 . A4 . C5 . . . A4 . . .' },
    { voice: 'pluck', vol: 0.14, notes: 'A3 . E4 . A4 . E4 . G3 . D4 . G4 . D4 . F3 . C4 . F4 . C4 . E3 . B3 . E4 . B3 .' }
  ],
  drums: {
    tom: 'x.....x.x.......x.....x.x...x.x.',
    clap: '....x.......x.......x.......x...'
  }
};
