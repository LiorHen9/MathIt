// Making puzzles by id (phase 9). Loaded with the puzzle screen, never on the first load.
import { makeBalance } from './balance';
import { makeKenKen } from './kenken';
import { makeMagic } from './magic';
import { makeMissing } from './missing';
import type { Puzzle, PuzzleId } from './types';

export * from './types';

/** The puzzle for (id, level, seed): always the same for the same three. */
export function makePuzzle(id: PuzzleId, level: number, seed: number): Puzzle {
  switch (id) {
    case 'magic':
      return makeMagic(level, seed);
    case 'balance':
      return makeBalance(level, seed);
    case 'missing':
      return makeMissing(level, seed);
    case 'kenken':
      return makeKenKen(level, seed);
  }
}
