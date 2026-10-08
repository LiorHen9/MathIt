// 🏀 Basketball's loop: a light hip-hop beat – a laid-back kick and snare, busy hats, a round bass
// and plucked chords in D minor.
import type { MusicLoop } from '../../audio/music';

export const loop: MusicLoop = {
  bpm: 90,
  steps: 32,
  parts: [
    { voice: 'pluck', vol: 0.18, len: 2, notes: 'D4 . . . F4 . . . A4 . . . C5 . . . D4 . . . F4 . . . G4 . . . E4 . . .' },
    { voice: 'marimba', vol: 0.14, notes: '. . A5 . . . . . . . C6 . A5 . . . . . A5 . . . . . G5 . . . E5 . . .' },
    { voice: 'bass', vol: 0.34, len: 2, notes: 'D2 . . D2 . . F2 . G2 . . . A2 . G2 . D2 . . D2 . . F2 . G2 . . . E2 . C2 .' }
  ],
  drums: {
    kick: 'x.....x...x.....x.....x...x..x..',
    snare: '....x.......x.......x.......x...',
    hat: 'x.x.x.x.x.x.x.xxx.x.x.x.x.x.x.x.'
  }
};
