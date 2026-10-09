// Question generators by id, and building a round. Loaded with the game (not on the home screen).
import { createRng } from '../rng';
import { getSkill } from '../skills/index';
import type { Generator, GeneratorId, Question, SkillId } from '../types';
import { add } from './add';
import { compare } from './compare';
import { count } from './count';
import { story, story20 } from './story';
import { sub } from './sub';
import { add20, bridgeAdd, bridgeSub, sub20 } from './arith20';
import { numbers100 } from './numbers100';
import { place } from './place';
import { pattern } from './pattern';
import { money } from './money';
import { clock } from './clock';
import { add100, sub100 } from './arith100';
import { mulBig, mulTable } from './mul';
import { div } from './div';
import { storyMulDiv } from './story';
import { colAdd, colSub } from './column';
import { fracAdd, fracCompare, fracEquiv, fracPart } from './fractions';
import { decAdd, decCompare, decRead } from './decimal';
import { area, perimeter } from './geometry';
import { answerKey } from '../types';

export const GENERATORS: Record<GeneratorId, Generator> = {
  count,
  compare,
  add,
  sub,
  story,
  add20,
  sub20,
  bridgeAdd,
  bridgeSub,
  story20,
  numbers100,
  place,
  pattern,
  money,
  clock,
  add100,
  sub100,
  mulTable,
  div,
  mulBig,
  storyMulDiv,
  colAdd,
  colSub,
  fracPart,
  fracCompare,
  fracEquiv,
  fracAdd,
  decRead,
  decCompare,
  decAdd,
  area,
  perimeter
};

/** The question for (skill, level, seed): always the same for the same three. */
export function makeQuestion(skillId: SkillId, level: number, seed: number): Question {
  const skill = getSkill(skillId);
  if (!skill) throw new Error(`unknown skill ${skillId}`);
  const lv = skill.levels.find((l) => l.level === level) ?? skill.levels[0];
  const rng = createRng(seed);
  const q = GENERATORS[skill.generatorId](lv, rng);
  return {
    ...q,
    id: `${skillId}:${lv.level}:${seed >>> 0}`,
    skillId,
    level: lv.level,
    seed: seed >>> 0,
    choices: rng.shuffle([q.answer, ...q.distractors])
  };
}

/** `n` questions of one skill, without repeating an exercise while there are new ones. */
export function makeRound(skillId: SkillId, level: number, seed: number, n = 8): Question[] {
  const rng = createRng(seed);
  const out: Question[] = [];
  const seen = new Set<string>();
  while (out.length < n) {
    let q = makeQuestion(skillId, level, rng.int(0, 0x7fffffff));
    for (let tries = 0; tries < 40 && (seen.has(q.key) || (out.length > 0 && answerKey(out.at(-1)!.answer) === answerKey(q.answer))); tries++) {
      q = makeQuestion(skillId, level, rng.int(0, 0x7fffffff));
    }
    seen.add(q.key);
    out.push(q);
  }
  return out;
}

/**
 * A question with a fixed exercise (a lesson's "your turn"): the first seed whose question has
 * this key, so it gets the generator's smart distractors, hints and explanation. Deterministic.
 */
export function findQuestion(skillId: SkillId, level: number, key: string, tries = 20000): Question | null {
  for (let seed = 0; seed < tries; seed++) {
    const q = makeQuestion(skillId, level, seed);
    if (q.key === key) return q;
  }
  return null;
}
