// ⚽ Football's loop: stadium drums (a marching kick and snare, toms like a chant) and a brass
// tune over G – C – D – G.
import type { MusicLoop } from '../../audio/music';

export const loop: MusicLoop = {
  bpm: 116,
  steps: 32,
  parts: [
    { voice: 'brass', vol: 0.15, len: 2, notes: 'G4 . B4 . D5 . . . E5 . D5 . C5 . . . A4 . B4 . C5 . A4 . G4 . . . D4 . . .' },
    { voice: 'bass', vol: 0.3, len: 2, notes: 'G2 . G2 . G2 . G2 . C3 . C3 . C3 . C3 . D3 . D3 . D3 . D3 . G2 . G2 . D3 . B2 .' }
  ],
  drums: {
    kick: 'x...x...x...x...x...x...x...x...',
    snare: '....x.......x.......x.......x...',
    tom: '..............x.x.............xx',
    hat: '..x...x...x...x...x...x...x...x.'
  }
};
