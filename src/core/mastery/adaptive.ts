// The level inside a round (docs/ARCHITECTURE.md §7.1 "רמת קושי"), pure:
// 3 right the first time in a row → the next questions are one level up;
// 2 wrong in a row → one level down, and hints come early (before a mistake) until the child
// gets 2 right the first time in a row again. A quest station keeps its fixed level (`fixed`),
// but still gets the early hints.

export const UP_AFTER = 3;
export const DOWN_AFTER = 2;
/** Right-first-time answers in a row that end the early hints. */
export const CALM_AFTER = 2;

export interface LevelState {
  level: number;
  /** Right the first time, in a row. */
  rightRun: number;
  /** Not right the first time, in a row. */
  wrongRun: number;
  /** Show a hint before the first mistake. */
  earlyHint: boolean;
}

export function startLevelState(level: number): LevelState {
  return { level, rightRun: 0, wrongRun: 0, earlyHint: false };
}

/** After one question: right the first time or not. `moved` says if the level changed. */
export function adaptLevel(s: LevelState, firstTry: boolean, maxLevel: number, fixed = false): LevelState & { moved: -1 | 0 | 1 } {
  if (firstTry) {
    const rightRun = s.rightRun + 1;
    const earlyHint = s.earlyHint && rightRun < CALM_AFTER;
    if (rightRun >= UP_AFTER && !fixed && s.level < maxLevel) return { level: s.level + 1, rightRun: 0, wrongRun: 0, earlyHint: false, moved: 1 };
    return { level: s.level, rightRun: rightRun >= UP_AFTER ? 0 : rightRun, wrongRun: 0, earlyHint, moved: 0 };
  }
  const wrongRun = s.wrongRun + 1;
  if (wrongRun >= DOWN_AFTER) {
    const down = !fixed && s.level > 1;
    return { level: down ? s.level - 1 : s.level, rightRun: 0, wrongRun: 0, earlyHint: true, moved: down ? -1 : 0 };
  }
  return { level: s.level, rightRun: 0, wrongRun, earlyHint: s.earlyHint, moved: 0 };
}
