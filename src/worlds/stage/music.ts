// 🎤 Stage's loop: upbeat pop – four on the floor, claps, synth chords over Am – F – C – G,
// a bouncing bass and a catchy synth line.
import type { MusicLoop } from '../../audio/music';

export const loop: MusicLoop = {
  bpm: 118,
  steps: 32,
  parts: [
    { voice: 'saw', vol: 0.11, len: 2, notes: 'E5 . E5 . D5 . C5 . . . C5 . D5 . E5 . A5 . G5 . E5 . . . C5 . D5 . . . . .' },
    { voice: 'pad', vol: 0.12, len: 8, notes: 'A3 . . . . . . . F3 . . . . . . . C4 . . . . . . . G3 . . . . . . .' },
    { voice: 'pad', vol: 0.1, len: 8, notes: 'C4 . . . . . . . A3 . . . . . . . E4 . . . . . . . B3 . . . . . . .' },
    { voice: 'bass', vol: 0.3, len: 2, notes: 'A2 . A2 . A2 . A2 . F2 . F2 . F2 . F2 . C3 . C3 . C3 . C3 . G2 . G2 . G2 . G2 .' }
  ],
  drums: {
    kick: 'x...x...x...x...x...x...x...x...',
    clap: '....x.......x.......x.......x...',
    hat: '..x...x...x...x...x...x...x...x.'
  }
};
