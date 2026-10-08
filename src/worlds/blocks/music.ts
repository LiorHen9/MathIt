// 🧱 Blocks' loop: a calm chiptune – a square-wave tune over F – Dm – B♭ – C, a round bass, a
// soft kick and hat.
import type { MusicLoop } from '../../audio/music';

export const loop: MusicLoop = {
  bpm: 104,
  steps: 32,
  parts: [
    { voice: 'chip', vol: 0.14, len: 2, notes: 'A4 . C5 . F5 . . . D5 . F5 . A5 . . . D5 . Bb4 . F4 . . . G4 . C5 . E5 . . .' },
    { voice: 'bass', vol: 0.3, len: 4, notes: 'F2 . . . F2 . . . D2 . . . D2 . . . Bb1 . . . Bb1 . . . C2 . . . C2 . . .' }
  ],
  drums: {
    kick: 'x.......x.......x.......x.......',
    hat: '..x...x...x...x...x...x...x...x.'
  }
};
