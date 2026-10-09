// What every puzzle board gets from screens/PuzzleHost.tsx (phase 9) – and what it reports: a
// piece placed (it plays its own tap), a wrong full board (a slip), a hint's sentence, solved.
import type { Gender } from '../../profiles/profiles';

export interface PuzzleProps {
  level: number;
  seed: number;
  gender?: Gender;
  /** Goes up by one every time the child asks for a hint: the board gives one (and its sentence). */
  hint: number;
  onHintText: (text: string) => void;
  /** The board is full but not right (the host counts the slip and says so). */
  onMistake: (el: Element | null) => void;
  onSolved: (el: Element | null) => void;
  /** The puzzle's one-sentence task (read aloud), once it is made. */
  onTask: (text: string) => void;
}
