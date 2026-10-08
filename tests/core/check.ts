// Learning Core checks that need no browser: `bun tests/core/check.ts`
// The seeded RNG; every generator over 1,000 seeds at every level (right answer, unique
// distractors, everything in the level's range, no negatives, same seed = same question);
// skills and recommendations; round scoring; phase 6 the mastery engine (mastery steps, the level
// inside a round, spaced review with an injected clock, questions weighted by the child's common
// mistake over 1,000 seeds, comebacks, the placement game with a child who knows and one who
// does not, placement on the map, the review station, recommendations and the summary);
// phase 8 the parents' area (mistakes in parents' words for every ErrorTag, practice time by
// day with an injected clock, the daily goal and the break reminder, the journey and the skills
// by chapter as parents see them).
import { createRng } from '../../src/core/rng';
import { SKILLS, getSkill, recommendedSkills, startLevel } from '../../src/core/skills/index';
import { GENERATORS, findQuestion, makeQuestion, makeRound } from '../../src/core/generators/index';
import { LESSONS, getLesson } from '../../src/core/lessons/index';
import { MAX_WRONG, nextLevel, questionPoints, starsFor } from '../../src/core/round';
import { JOURNEY, allNodes, chapterNodes, chapterMaxStars, chapterStars, emptyProgress, findNode, journeyProblems, lockReason, maxStars, nextNode, nodeStatus, progressFromSkills, withStars, type QuestProgress } from '../../src/core/quest/index';
import { DEFAULT_WORDS, PLACEHOLDERS, fillQuestion, fillText, hasPlaceholders, type StoryWords } from '../../src/core/story';
import {
  DAY,
  MASTERED,
  REVIEW_DAYS,
  LADDER,
  adaptLevel,
  commonError,
  dueSkills,
  emptyMastery,
  isDue,
  isMastered,
  knownRung,
  normalizeMastery,
  placementResult,
  placementStep,
  recommendByMastery,
  rungKnown,
  startLevelState,
  startPlacement,
  summarize,
  updateMastery,
  type AnswerResult,
  type MasteryFields,
  type PlacementState
} from '../../src/core/mastery/index';
import {
  KEEP_DAYS,
  PARENT_ERRORS,
  addAnswer,
  allowedTemplates,
  practiceSkills,
  reachedChapters,
  stationTemplate,
  breakDue,
  dayKey,
  durationText,
  emptyDayLog,
  goalProgress,
  journeyView,
  lastDays,
  normalizeDayLog,
  normalizeGoal,
  skillStatus,
  skillsByChapter,
  staleDays,
  statusCounts,
  timeStats,
  weekdayLabel
} from '../../src/core/parents/index';
import { invites, makeAdaptiveRound, pickQuestion, sisterOf } from '../../src/core/mastery/pick';
import { REVIEW_ID, progressFromPlacement, reviewNode, reviewSkills } from '../../src/core/quest/index';
import type { AgeBand, ErrorTag, SkillId } from '../../src/core/types';
import { ACTION_KINDS, COIN_VALUES, ERROR_TAGS, TEMPLATE_IDS, actionResult, actionValid, answerKey, isCorrect, isTime, pickHint, promptFor, sameAnswer, templateFits, type Action, type Answer, type Question, type Step, type Visual } from '../../src/core/types';
import { hopsFor } from '../../src/core/generators/common';
import { coinsFor } from '../../src/core/generators/money';
import { handsSwapped, timeWords } from '../../src/core/generators/clock';

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.log('✗', msg);
};
const ok = (msg: string) => console.log('✓', msg);

// Same seed → same sequence; different seed → different sequence.
{
  const a = createRng(42);
  const b = createRng(42);
  const c = createRng(43);
  const sa = Array.from({ length: 50 }, () => a.next());
  const sb = Array.from({ length: 50 }, () => b.next());
  const sc = Array.from({ length: 50 }, () => c.next());
  if (sa.join() !== sb.join()) fail('rng: same seed gives a different sequence');
  if (sa.join() === sc.join()) fail('rng: different seeds give the same sequence');
  if (sa.some((x) => x < 0 || x >= 1)) fail('rng: next() outside [0, 1)');
  ok('rng is reproducible by seed');
}

// int(min, max) stays in range and reaches both ends; roughly uniform.
{
  const r = createRng(7);
  const counts = new Map<number, number>();
  const N = 60000;
  for (let i = 0; i < N; i++) {
    const v = r.int(0, 9);
    if (!Number.isInteger(v) || v < 0 || v > 9) {
      fail(`rng.int out of range: ${v}`);
      break;
    }
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  if (counts.size !== 10) fail(`rng.int(0, 9) hit ${counts.size} values, expected 10`);
  for (const [v, n] of counts) if (Math.abs(n - N / 10) > N / 10 * 0.1) fail(`rng.int: value ${v} came ${n} times (far from ${N / 10})`);
  if (createRng(1).int(5, 5) !== 5) fail('rng.int(5, 5) should be 5');
  let threw = false;
  try {
    createRng(1).int(3, 2);
  } catch {
    threw = true;
  }
  if (!threw) fail('rng.int(3, 2) should throw');
  ok('rng.int in range and uniform');
}

// shuffle keeps the items; pick returns an item.
{
  const r = createRng(99);
  const items = [1, 2, 3, 4, 5, 6, 7, 8];
  const s = r.shuffle(items);
  if ([...s].sort((x, y) => x - y).join() !== items.join()) fail('rng.shuffle lost or duplicated items');
  if (items.join() !== '1,2,3,4,5,6,7,8') fail('rng.shuffle changed its input');
  for (let i = 0; i < 100; i++) if (!items.includes(r.pick(items))) fail('rng.pick returned a foreign item');
  ok('rng.shuffle and rng.pick');
}

/** What is wrong with an animated explanation, or '' if nothing. */
function explanationProblem(steps: Step[], answer: Answer): string {
  const actions = steps.map((s) => s.action).filter((a): a is Action => !!a);
  if (!actions.length) return 'explanation without an animation';
  for (const s of steps) {
    if (!s.text.trim()) return 'an explanation step without text';
    if (s.action && !actionValid(s.action)) return `invalid action ${JSON.stringify(s.action)}`;
  }
  const end = actionResult(actions.at(-1)!);
  if (!sameAnswer(end, answer)) return `the explanation ends on ${answerKey(end)}, the answer is ${answerKey(answer)}`;
  return '';
}

// ---------- Actions ----------
{
  const cases: [Action, Answer][] = [
    [{ kind: 'count', n: 4 }, 4],
    [{ kind: 'tenFrame', n: 10 }, 10],
    [{ kind: 'combine', a: 3, b: 4 }, 7],
    [{ kind: 'takeAway', a: 9, b: 3 }, 6],
    [{ kind: 'jump', from: 5, by: 3 }, 8],
    [{ kind: 'jump', from: 7, by: -3 }, 4],
    [{ kind: 'compare', a: 2, b: 5 }, '<'],
    [{ kind: 'compare', a: 6, b: 1 }, '>'],
    [{ kind: 'compare', a: 3, b: 3 }, '='],
    [{ kind: 'compare', a: 47, b: 74 }, '<'],
    // Phase 7.
    [{ kind: 'tens', tens: 4, ones: 7 }, 47],
    [{ kind: 'tens', tens: 2, ones: 13 }, 33],
    [{ kind: 'tens', tens: 3, ones: 8, add: 25 }, 63],
    [{ kind: 'tens', tens: 5, ones: 2, take: 17 }, 35],
    [{ kind: 'tens', tens: 4, ones: 7, ask: 'tens' }, 4],
    [{ kind: 'tens', tens: 4, ones: 7, ask: 'ones' }, 7],
    [{ kind: 'tens', tens: 10, ones: 0 }, 100],
    [{ kind: 'doubleFrame', a: 8, b: 5 }, 13],
    [{ kind: 'doubleFrame', a: 13, b: -5 }, 8],
    [{ kind: 'line', from: 38, hops: [10, 10, 2, 3], max: 100 }, 63],
    [{ kind: 'line', from: 13, hops: [-3, -2], max: 20 }, 8],
    [{ kind: 'clock', h: 3, m: 30 }, { h: 3, m: 30 }],
    [{ kind: 'coins', coins: [10, 5, 2, 0.5] }, 17.5]
  ];
  for (const [a, want] of cases) {
    if (!sameAnswer(actionResult(a), want)) fail(`actionResult(${JSON.stringify(a)}) = ${answerKey(actionResult(a))}, expected ${answerKey(want)}`);
    if (!actionValid(a)) fail(`${JSON.stringify(a)} should be valid`);
  }
  if (new Set(cases.map(([a]) => a.kind)).size !== ACTION_KINDS.length) fail('not every action kind is checked');
  const bad: Action[] = [
    { kind: 'count', n: 0 },
    { kind: 'count', n: 11 },
    { kind: 'combine', a: 6, b: 5 },
    { kind: 'takeAway', a: 3, b: 4 },
    { kind: 'jump', from: 8, by: 3 },
    { kind: 'jump', from: 2, by: -3 },
    { kind: 'jump', from: 2, by: 0 },
    { kind: 'tenFrame', n: 2.5 },
    { kind: 'compare', a: 101, b: 3 },
    { kind: 'tens', tens: 11, ones: 0 },
    { kind: 'tens', tens: 9, ones: 5, add: 10 },
    { kind: 'tens', tens: 1, ones: 2, take: 13 },
    { kind: 'tens', tens: 1, ones: 2, add: 3, take: 1 },
    { kind: 'tens', tens: 0, ones: 0 },
    { kind: 'doubleFrame', a: 11, b: 3 },
    { kind: 'doubleFrame', a: 15, b: 6 },
    { kind: 'doubleFrame', a: 5, b: -6 },
    { kind: 'line', from: 18, hops: [3], max: 20 },
    { kind: 'line', from: 5, hops: [11], max: 100 },
    { kind: 'line', from: 5, hops: [], max: 100 },
    { kind: 'line', from: 5, hops: Array(13).fill(1), max: 100 },
    { kind: 'clock', h: 0, m: 0 },
    { kind: 'clock', h: 3, m: 7 },
    { kind: 'coins', coins: [3] },
    { kind: 'coins', coins: [] },
    { kind: 'coins', coins: Array(11).fill(1) }
  ];
  for (const a of bad) if (actionValid(a)) fail(`${JSON.stringify(a)} should be invalid`);
  // The number line hops by tens, then by ones split at the next ten.
  const hopCases: [number, number, number[]][] = [
    [38, 25, [10, 10, 2, 3]],
    [8, 5, [2, 3]],
    [13, -5, [-3, -2]],
    [52, -17, [-10, -2, -5]],
    [40, -3, [-3]],
    [3, 4, [4]]
  ];
  for (const [from, by, want] of hopCases) if (hopsFor(from, by).join() !== want.join()) fail(`hopsFor(${from}, ${by}) = ${hopsFor(from, by)}, expected ${want}`);
  if (coinsFor(17.5).join() !== '10,5,2,0.5' || coinsFor(3).join() !== '2,1') fail(`coinsFor: ${coinsFor(17.5)} / ${coinsFor(3)}`);
  if (answerKey(handsSwapped({ h: 3, m: 0 })) !== '12:15' || answerKey(handsSwapped({ h: 3, m: 30 })) !== '6:15') fail('handsSwapped');
  if (timeWords({ h: 3, m: 45 }) !== 'רבע לארבע' || timeWords({ h: 12, m: 30 }) !== 'שתים-עשרה וחצי') fail('timeWords');
  ok('actions: results and limits per action (to 10, two frames to 20, tens/line/compare to 100, clock, coins); hops, coins, clock words');
}

// ---------- Generators: 1,000 seeds per skill and level ----------
{
  const SIGNS = ['<', '>', '='];
  /** The value an exercise stands for, computed independently of the generator. */
  function solve(q: Question): Answer {
    const m = q.prompt.math ?? '';
    const t = q.prompt.text;
    let r: RegExpExecArray | null;
    if ((r = /^(\d+) \+ (\d+) = \?$/.exec(m))) return Number(r[1]) + Number(r[2]);
    if ((r = /^(\d+) − (\d+) = \?$/.exec(m))) return Number(r[1]) - Number(r[2]);
    if ((r = /^(\d+) \? (\d+)$/.exec(m))) {
      const [a, b] = [Number(r[1]), Number(r[2])];
      return a > b ? '>' : a < b ? '<' : '=';
    }
    // A sequence with one missing number: "2, 4, ?, 8"; two numbers – what comes after / before.
    if (/^[\d?]+(, [\d?]+)+$/.test(m)) {
      const xs = m.split(', ');
      const gap = xs.indexOf('?');
      if (xs.length === 2) return gap === 1 ? Number(xs[0]) + 1 : Number(xs[1]) - 1;
      const known = xs.map((x, i) => [i, Number(x)] as const).filter(([i]) => i !== gap);
      const [[i0, v0], [i1, v1]] = known;
      const step = (v1 - v0) / (i1 - i0);
      return v0 + step * (gap - i0);
    }
    if ((r = /כמה עשרות יש במספר (\d+)/.exec(t))) return Math.floor(Number(r[1]) / 10);
    if ((r = /כמה אחדות יש במספר (\d+)/.exec(t))) return Number(r[1]) % 10;
    if ((r = /כמה שווה הספרה (\d) במספר (\d+)/.exec(t))) return Number(r[1]) * (String(r[2]).indexOf(r[1]) === 0 ? 10 : 1);
    const v = q.prompt.visual;
    if (!m && v?.kind === 'dots') return v.groups[0];
    if (!m && v?.kind === 'blocks') return v.tens * 10 + v.ones;
    if (!m && v?.kind === 'coins') return v.coins.reduce((a, c) => a + c, 0);
    if (!m && v?.kind === 'clock') return { h: v.h, m: v.m };
    throw new Error(`cannot read exercise "${m}" / "${t}"`);
  }
  function visualOk(v: Visual | undefined): boolean {
    if (!v) return true;
    switch (v.kind) {
      case 'dots':
        return v.groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 10) && (v.crossed ?? 0) <= v.groups.at(-1)!;
      case 'blocks':
        return Number.isInteger(v.tens) && v.tens >= 0 && v.tens <= 10 && Number.isInteger(v.ones) && v.ones >= 0 && v.ones <= 9 && v.tens + v.ones > 0;
      case 'coins':
        return v.coins.length > 0 && v.coins.length <= 10 && v.coins.every((c) => COIN_VALUES.includes(c));
      case 'clock':
        return actionValid({ kind: 'clock', h: v.h, m: v.m });
    }
  }
  /** Skills of phase 7: every kind of mistake they offer has its own hint. */
  const PHASE7 = new Set(SKILLS.slice(5).map((s) => s.id));
  for (const skill of SKILLS) {
    if (!GENERATORS[skill.generatorId]) fail(`${skill.id}: no generator "${skill.generatorId}"`);
    for (const lv of skill.levels) {
      const answers = new Set<string>();
      let bad = 0;
      for (let seed = 0; seed < 1000 && bad < 5; seed++) {
        const q = makeQuestion(skill.id, lv.level, seed);
        const where = `${skill.id} L${lv.level} seed ${seed} (${q.prompt.math ?? q.key})`;
        const err = (msg: string) => {
          bad++;
          fail(`${where}: ${msg}`);
        };
        const sign = typeof q.answer === 'string';
        const want = sign ? 2 : 3;
        if (!sameAnswer(q.answer, solve(q))) err(`answer ${answerKey(q.answer)}, exercise says ${answerKey(solve(q))}`);
        if (!isCorrect(q, q.answer)) err('isCorrect(answer) is false');
        if (q.distractors.length !== want) err(`${q.distractors.length} distractors, expected ${want}`);
        const keys = q.distractors.map(answerKey);
        if (new Set(keys).size !== q.distractors.length) err(`repeated distractors ${keys}`);
        if (q.distractors.some((d) => isCorrect(q, d))) err('a distractor counts as correct');
        const choiceKeys = q.choices.map(answerKey);
        if (q.choices.length !== want + 1 || !choiceKeys.includes(answerKey(q.answer)) || keys.some((d) => !choiceKeys.includes(d))) err(`choices ${choiceKeys}`);
        for (const d of keys) if (!q.errorTags[d]) err(`no error tag for ${d}`);
        for (const tag of Object.values(q.errorTags)) if (!ERROR_TAGS.includes(tag)) err(`unknown error tag ${tag}`);
        const all = [q.answer, ...q.distractors];
        const nums = all.filter((x): x is number => typeof x === 'number');
        if (q.numeric && typeof q.answer !== 'number') err('numeric question with a non-number answer');
        if (q.numeric && nums.some((n) => !Number.isInteger(n))) err('a typed answer must be a whole number');
        if (nums.length) {
          if (nums.length !== all.length) err('mixed kinds of choices');
          for (const n of nums) if (n < 0 || n < lv.min || n > lv.max || !Number.isInteger(n * 2)) err(`${n} outside ${lv.min}..${lv.max} or negative`);
        } else if (sign) {
          if (all.some((x) => !SIGNS.includes(String(x)))) err('comparison choices must be signs');
        } else if (all.every(isTime)) {
          for (const x of all) if (!isTime(x) || !actionValid({ kind: 'clock', h: x.h, m: x.m })) err(`not a clock time: ${answerKey(x)}`);
        } else err('unknown kind of answer');
        const inMath = (q.prompt.math ?? '').match(/\d+/g)?.map(Number) ?? [];
        for (const n of inMath) if (n < lv.min || n > lv.max || n < 0) err(`exercise number ${n} outside ${lv.min}..${lv.max}`);
        if (!visualOk(q.prompt.visual)) err('bad visual');
        for (const p of [q.prompt, ...Object.values(q.prompts ?? {})]) if (!p || !p.text || !p.speech || /[^\s]\.\s+\S.*[.?!]$/.test(p.speech)) err(`prompt should be one sentence: "${p?.speech}"`);
        // Every template of the skill that fits the question can play it; Pop always fits.
        if (!templateFits('pop', q)) err('Pop must fit every question');
        for (const t of skill.templates) if (!TEMPLATE_IDS.includes(t)) err(`unknown template ${t}`);
        if (q.unit === '₪' && !templateFits('shop', q)) err('a money question must fit the shop');
        if (isTime(q.answer) && (!templateFits('clock', q) || promptFor(q, 'clock').prompt === q.prompt)) err('a clock question must fit the clock template with its own prompt');
        if (q.hints.length < 1 || !q.hints[0].text) err('no hint');
        if (q.explanation.length < 1) err('no explanation');
        // Animated explanation: valid actions, and the last one lands on the answer.
        const why = explanationProblem(q.explanation, q.answer);
        if (why) err(why);
        // Hints: the default has an animation; every wrong choice gets an animated hint.
        if (q.hints[0].for) err('the first hint should be the default (no `for`)');
        for (const h of q.hints) if (!h.action || !actionValid(h.action)) err(`hint without a valid action: ${JSON.stringify(h)}`);
        for (const d of q.distractors) if (!pickHint(q, d).action) err(`no animated hint for ${answerKey(d)}`);
        if (PHASE7.has(skill.id)) for (const tag of new Set(Object.values(q.errorTags))) if (!q.hints.some((h) => h.for?.includes(tag))) err(`no hint for "${tag}"`);
        const again = makeQuestion(skill.id, lv.level, seed);
        if (JSON.stringify(again) !== JSON.stringify(q)) err('same seed gave a different question');
        answers.add(answerKey(q.answer));
      }
      // Variety: every possible answer shows up across the seeds.
      const span = skill.generatorId === 'compare' ? 3 : skill.generatorId === 'count' ? lv.max - lv.min + 1 : 0;
      if (span && answers.size < span) fail(`${skill.id} L${lv.level}: only ${answers.size} different answers over 1000 seeds`);
    }
  }
  // Smart distractors appear where they can.
  const tags = (skillId: Parameters<typeof makeQuestion>[0], level: number) => {
    const t = new Set<string>();
    for (let seed = 0; seed < 300; seed++) Object.values(makeQuestion(skillId, level, seed).errorTags).forEach((x) => t.add(x));
    return t;
  };
  const need: [Parameters<typeof makeQuestion>[0], number, string[]][] = [
    ['add.within10', 3, ['count-off-by-one', 'subtracted']],
    ['sub.within10', 3, ['count-off-by-one', 'added', 'one-part']],
    ['compare.to10', 2, ['reversed-sign', 'not-equal']],
    ['count.to10', 3, ['count-off-by-one']],
    // Phase 7: the new kinds of mistakes are on offer where they belong.
    ['add.within20', 1, ['count-off-by-one', 'one-part']],
    ['add.within20', 2, ['no-bridge']],
    ['sub.within20', 2, ['no-bridge', 'added']],
    ['add.bridge10', 1, ['no-bridge', 'count-off-by-one']],
    ['sub.bridge10', 2, ['no-bridge', 'added']],
    ['story.within20', 2, ['no-bridge']],
    ['numbers.to100', 3, ['swapped-digits', 'tens-as-ones', 'reversed-sign', 'count-off-by-one']],
    ['place.value', 1, ['tens-as-ones']],
    ['place.value', 2, ['swapped-digits', 'one-part']],
    ['place.value', 3, ['swapped-digits', 'tens-as-ones']],
    ['add.within100', 1, ['tens-as-ones']],
    ['add.within100', 2, ['swapped-digits']],
    ['add.within100', 3, ['no-carry']],
    ['sub.within100', 1, ['tens-as-ones', 'added']],
    ['sub.within100', 3, ['no-borrow']],
    ['pattern', 1, ['wrong-step']],
    ['money', 1, ['one-part', 'count-off-by-one']],
    ['money', 3, ['added']],
    ['clock', 1, ['hands-swapped', 'near']],
    ['clock', 3, ['hands-swapped']]
  ];
  for (const [id, lv, want] of need) {
    const got = tags(id, lv);
    for (const w of want) if (!got.has(w)) fail(`${id}: never offers a "${w}" distractor`);
  }
  // 7 + 2: the classic slips are offered.
  {
    let found = false;
    for (let seed = 0; seed < 5000 && !found; seed++) {
      const q = makeQuestion('add.within10', 3, seed);
      if (q.prompt.math === '7 + 2 = ?') {
        found = true;
        for (const [d, tag] of [
          [8, 'count-off-by-one'],
          [10, 'count-off-by-one'],
          [5, 'subtracted']
        ] as const)
          if (q.errorTags[String(d)] !== tag) fail(`7 + 2: expected ${d} as "${tag}", got ${JSON.stringify(q.errorTags)}`);
      }
    }
    if (!found) fail('7 + 2 never generated in 5000 seeds');
  }
  // Hints follow the kind of mistake.
  {
    const want: [Parameters<typeof makeQuestion>[0], string, Action['kind']][] = [
      ['sub.within10', 'added', 'takeAway'],
      ['sub.within10', 'count-off-by-one', 'jump'],
      ['add.within10', 'count-off-by-one', 'jump'],
      ['add.within10', 'subtracted', 'combine'],
      ['count.to10', 'count-off-by-one', 'tenFrame'],
      ['compare.to10', 'reversed-sign', 'compare'],
      ['add.bridge10', 'no-bridge', 'doubleFrame'],
      ['add.bridge10', 'count-off-by-one', 'line'],
      ['sub.bridge10', 'no-bridge', 'doubleFrame'],
      ['add.within100', 'no-carry', 'tens'],
      ['add.within100', 'count-off-by-one', 'line'],
      ['sub.within100', 'no-borrow', 'tens'],
      ['place.value', 'swapped-digits', 'tens'],
      ['pattern', 'wrong-step', 'line'],
      ['money', 'added', 'line'],
      ['clock', 'hands-swapped', 'clock'],
      ['numbers.to100', 'reversed-sign', 'compare']
    ];
    for (const [id, tag, kind] of want) {
      let seen = false;
      const top = getSkill(id)!.levels.length;
      for (let seed = 0; seed < 400 && !seen; seed++) {
        const q = makeQuestion(id, top, seed);
        const wrong = q.choices.find((d) => q.errorTags[answerKey(d)] === tag);
        if (wrong === undefined) continue;
        seen = true;
        const h = pickHint(q, wrong);
        if (h.action?.kind !== kind) fail(`${id}: a "${tag}" mistake should get a ${kind} hint, got ${h.action?.kind}`);
      }
      if (!seen) fail(`${id}: no "${tag}" mistake to check`);
    }
    const q = makeQuestion('add.within10', 3, 1);
    if (pickHint(q) !== q.hints[0]) fail('pickHint without a mistake should give the default hint');
  }
  ok(`generators: ${SKILLS.length} skills × every level × 1000 seeds – right answers, unique smart distractors, in range, reproducible, animated explanations and hints`);
}

// ---------- Lessons ----------
{
  for (const skill of SKILLS) {
    const l = getLesson(skill.id);
    if (!l) {
      fail(`${skill.id}: no lesson`);
      continue;
    }
    if (l.parts.length < 3 || l.parts.length > 5) fail(`${skill.id}: lesson of ${l.parts.length} screens (3–5)`);
    if (!l.parts.some((p) => p.kind === 'watch') || !l.parts.some((p) => p.kind === 'try')) fail(`${skill.id}: a lesson needs a "watch" and a "try"`);
    if (l.parts[0].kind !== 'watch') fail(`${skill.id}: a lesson starts by showing`);
    for (const [i, p] of l.parts.entries()) {
      if (!p.title) fail(`${skill.id} screen ${i + 1}: no title`);
      if (p.kind === 'watch') {
        if (!p.steps.length || !p.steps.some((s) => s.action)) fail(`${skill.id} screen ${i + 1}: nothing animated`);
        for (const s of p.steps) {
          if (s.action && !actionValid(s.action)) fail(`${skill.id} screen ${i + 1}: invalid ${JSON.stringify(s.action)}`);
          // One sentence per step for the youngest (a list of numbers is fine).
          if ((s.text.match(/[.!?](\s|$)/g) ?? []).length > 2) fail(`${skill.id} screen ${i + 1}: step too long: "${s.text}"`);
        }
        // The animation and the exercise in the same screen agree.
        const math = p.steps.map((s) => s.math).filter(Boolean).at(-1);
        const last = p.steps.map((s) => s.action).filter((a): a is Action => !!a).at(-1)!;
        const res = /=\s*(\d+)$/.exec(math ?? '')?.[1] ?? /^(\d+)$/.exec(math ?? '')?.[1];
        if (res && last.kind !== 'compare' && Number(res) !== actionResult(last)) fail(`${skill.id} screen ${i + 1}: shows ${math} but the animation ends on ${actionResult(last)}`);
      } else {
        const q = findQuestion(skill.id, p.level, p.key);
        if (!q) fail(`${skill.id} screen ${i + 1}: no question with key ${p.key} at level ${p.level}`);
        else if (q.key !== p.key || q.level !== p.level) fail(`${skill.id}: findQuestion gave ${q.key}`);
        else if (JSON.stringify(findQuestion(skill.id, p.level, p.key)) !== JSON.stringify(q)) fail(`${skill.id}: findQuestion is not deterministic`);
      }
    }
  }
  if (LESSONS.length !== SKILLS.length) fail(`${LESSONS.length} lessons for ${SKILLS.length} skills`);
  ok(`lessons: ${LESSONS.length} lessons of 3–5 screens, animations valid, every "try" question exists`);
}

// ---------- Rounds ----------
{
  for (const skill of SKILLS) {
    for (const lv of skill.levels) {
      const r = makeRound(skill.id, lv.level, 12345);
      if (r.length !== 8) fail(`${skill.id}: round of ${r.length}`);
      if (JSON.stringify(makeRound(skill.id, lv.level, 12345)) !== JSON.stringify(r)) fail(`${skill.id}: round not reproducible`);
      const keys = new Set(r.map((q) => q.key));
      const possible = skill.generatorId === 'count' ? lv.max - lv.min + 1 : 8;
      if (keys.size < Math.min(8, possible)) fail(`${skill.id} L${lv.level}: repeated exercises in a round (${[...keys]})`);
      for (let i = 1; i < r.length; i++) if (sameAnswer(r[i].answer, r[i - 1].answer) && possible > 2) fail(`${skill.id} L${lv.level}: same answer twice in a row`);
    }
  }
  ok('rounds: 8 questions, reproducible, no repeated exercise or answer twice in a row');
}

// ---------- Skills, recommendations, scoring ----------
{
  const ids = SKILLS.map((s) => s.id);
  if (ids.join() !== 'count.to10,compare.to10,add.within10,sub.within10,story.within10,add.within20,sub.within20,add.bridge10,sub.bridge10,story.within20,numbers.to100,place.value,pattern,money,clock,add.within100,sub.within100') fail('skills: ' + ids);
  // Prerequisites come earlier in the list (the graph has no cycles), every skill plays in Pop.
  SKILLS.forEach((s, i) => {
    for (const p of s.prerequisites) if (SKILLS.findIndex((x) => x.id === p) >= i) fail(`${s.id}: prerequisite ${p} comes later`);
    if (s.templates[0] !== 'pop') fail(`${s.id}: Pop first`);
  });
  for (const s of SKILLS) {
    for (const p of s.prerequisites) if (!getSkill(p)) fail(`${s.id}: unknown prerequisite ${p}`);
    if (s.levels.length < 2 || s.levels.length > 3) fail(`${s.id}: ${s.levels.length} levels (2–3 wanted)`);
    s.levels.forEach((l, i) => l.level !== i + 1 && fail(`${s.id}: levels not numbered 1..n`));
  }
  if (recommendedSkills('4-5').join() !== 'count.to10,compare.to10') fail('recommended 4-5: ' + recommendedSkills('4-5'));
  if (recommendedSkills('6-7').join() !== 'add.within10,sub.within10,story.within10') fail('recommended 6-7: ' + recommendedSkills('6-7'));
  if (recommendedSkills('10-12').join() !== 'add.within100,sub.within100') fail('recommended 10-12: ' + recommendedSkills('10-12'));
  if (startLevel(getSkill('add.within10')!, '4-5') !== 1 || startLevel(getSkill('count.to10')!, '6-7') !== 3) fail('startLevel');
  if (MAX_WRONG !== 2) fail('two mistakes before the answer is shown');
  if (questionPoints(0, true) !== 1 || questionPoints(1, true) !== 0.5 || questionPoints(2, false) !== 0) fail('questionPoints');
  const cases: [number, number][] = [
    [8, 3],
    [7.5, 3],
    [7, 2],
    [5.5, 2],
    [5, 1],
    [3, 1],
    [2.5, 0],
    [0, 0]
  ];
  for (const [pts, want] of cases) if (starsFor(pts, 8) !== want) fail(`starsFor(${pts}, 8) = ${starsFor(pts, 8)}, expected ${want}`);
  if (nextLevel(1, 3, 3) !== 2 || nextLevel(3, 3, 3) !== 3 || nextLevel(2, 0, 3) !== 1 || nextLevel(1, 0, 3) !== 1 || nextLevel(2, 2, 3) !== 2) fail('nextLevel');
  ok('skills graph, recommendations by age band, stars and level changes');
}

// ---------- The quest map ----------
{
  const exists = (id: string, level?: number) => {
    const s = getSkill(id);
    return !!s && (level === undefined || s.levels.some((l) => l.level === level));
  };
  const problems = journeyProblems(JOURNEY, exists);
  for (const pr of problems) fail(`journey: ${pr}`);
  const nodes = allNodes();
  const ch = JOURNEY.chapters[0];
  const c1 = chapterNodes(ch);
  if (c1.length !== 16) fail(`chapter 1 has ${c1.length} stations (16, unchanged)`);
  if (JOURNEY.chapters.map((c) => c.id).join() !== 'c1,c2,c3,c4,c5') fail('chapters: ' + JOURNEY.chapters.map((c) => c.id));
  if (ch.sections.map((s) => s.title).join('|') !== 'מספרים עד 10|חיבור וחיסור עד 10') fail('sections: ' + ch.sections.map((s) => s.title));
  const boss = c1.at(-1)!;
  if (boss.kind === 'boss' && !(boss.skillIds.includes('add.within10') && boss.skillIds.includes('sub.within10'))) fail('the boss mixes adding and taking away');
  // Every chapter: from a lesson to its boss (stronger each chapter), a chest in the middle, banners.
  let lastHits = 0;
  JOURNEY.chapters.forEach((c, k) => {
    const list = chapterNodes(c);
    if (list[0].kind !== 'lesson' || list.at(-1)!.kind !== 'boss') fail(`${c.id} runs from a lesson to the boss`);
    const chestAt = list.findIndex((n) => n.kind === 'chest');
    if (chestAt < 3 || chestAt > list.length - 3) fail(`${c.id}: the chest should be in the middle`);
    if (c.sections.length < 2 || c.sections.some((s) => !s.title || !s.nodes.length)) fail(`${c.id}: two banners or more`);
    const b = list.at(-1)!;
    if (b.kind === 'boss') {
      if (b.tier !== k + 1) fail(`${c.id}: boss tier ${b.tier}`);
      if (b.hits < lastHits) fail(`${c.id}: the boss should not get weaker`);
      lastHits = b.hits;
      for (const id of b.skillIds) if (!list.some((n) => n.kind === 'practice' && n.skillId === id)) fail(`${c.id}: the boss asks ${id}, never practised in the chapter`);
    }
    if (!c.title.startsWith(`פרק ${k + 1}:`)) fail(`${c.id}: title ${c.title}`);
  });
  // Every skill is on the journey; every new game is played at some station.
  for (const sk of SKILLS) if (sk.id !== 'story.within10' && !nodes.some((n) => n.kind === 'practice' && n.skillId === sk.id)) fail(`${sk.id} is not on the journey`);
  for (const t of TEMPLATE_IDS) if (t !== 'pop' && !nodes.some((n) => n.kind === 'practice' && n.template === t)) fail(`no station plays ${t}`);
  // A station's game is one its skill is played in, and fits its questions.
  for (const n of nodes)
    if (n.kind === 'practice' && n.template) {
      if (!getSkill(n.skillId)!.templates.includes(n.template)) fail(`${n.id}: ${n.skillId} is not played in ${n.template}`);
      let fits = 0;
      for (let seed = 0; seed < 200; seed++) if (templateFits(n.template, makeQuestion(n.skillId, n.level, seed))) fits++;
      if (fits < 120) fail(`${n.id}: ${n.template} fits only ${fits}/200 of its questions`);
    }
  // Every skill gets its lesson before its first practice; practice levels rise per skill (the
  // same level again only in another game).
  const seenLesson = new Set<string>();
  const lastLevel: Record<string, { level: number; template: string }> = {};
  for (const n of nodes) {
    if (n.kind === 'lesson') seenLesson.add(n.skillId);
    if (n.kind === 'practice') {
      if (!seenLesson.has(n.skillId)) fail(`${n.id}: practice before the lesson`);
      const last = lastLevel[n.skillId];
      if (last && (last.level > n.level || (last.level === n.level && last.template === (n.template ?? 'pop')))) fail(`${n.id}: levels should rise`);
      lastLevel[n.skillId] = { level: n.level, template: n.template ?? 'pop' };
    }
  }

  // A new profile: only the first station is open.
  let p = emptyProgress();
  const st = (q: QuestProgress) => nodes.map((n) => nodeStatus(n, q)[0]).join('');
  if (st(p) !== 'o' + 'l'.repeat(nodes.length - 1)) fail('new profile: ' + st(p));
  if (nextNode(p)?.id !== nodes[0].id) fail('the first station is next');

  // Opening only goes forward: play in order with random stars; at every point the stations
  // after the next one are locked, and later stars never change an earlier station.
  const rng = createRng(2024);
  for (let run = 0; run < 200; run++) {
    p = emptyProgress();
    for (let k = 0; k < nodes.length; k++) {
      const n = nodes[k];
      if (nodeStatus(n, p) !== 'open') {
        // Only a star gate may stop the way – replaying for more stars opens it.
        const why = lockReason(n, p);
        if (!why || why.before || !why.stars) fail(`run ${run}: ${n.id} closed for ${JSON.stringify(why)}`);
        for (const x of nodes.slice(0, k)) if (x.kind === 'practice') p = withStars(p, x.id, 3);
        if (nodeStatus(n, p) !== 'open') {
          fail(`run ${run}: ${n.id} still closed after 3 stars everywhere`);
          break;
        }
      }
      if (nextNode(p)?.id !== n.id) fail(`run ${run}: next should be ${n.id}, got ${nextNode(p)?.id}`);
      for (const later of nodes.slice(k + 1)) if (nodeStatus(later, p) !== 'locked') fail(`run ${run}: ${later.id} opened before ${n.id} was done`);
      const before = nodes.slice(0, k + 1).map((x) => nodeStatus(x, p)).join();
      // Stars on stations further on (impossible in play) do not change these.
      const fake = nodes.slice(k + 1).reduce((q, x) => (x.kind === 'chest' || x.needStars ? q : withStars(q, x.id, 3)), p);
      if (nodes.slice(0, k + 1).map((x) => nodeStatus(x, fake)).join() !== before) fail(`run ${run}: stars further on changed the stations up to ${n.id}`);
      p = n.kind === 'chest' ? { ...p, chests: { ...p.chests, [n.id]: n.prize.icon } } : withStars(p, n.id, 1 + rng.int(0, maxStars(n) - 1));
      if (nodeStatus(n, p) !== 'done') fail(`run ${run}: ${n.id} not done after playing it`);
    }
    if (nextNode(p) !== null) fail(`run ${run}: everything played but next is ${nextNode(p)?.id}`);
  }

  // Star gates: one star everywhere is not enough for the chest; it says how many are missing.
  const chestAt = c1.findIndex((n) => n.kind === 'chest');
  p = emptyProgress();
  for (const n of nodes.slice(0, chestAt)) p = withStars(p, n.id, 1);
  const chest = nodes[chestAt];
  const why = lockReason(chest, p);
  if (nodeStatus(chest, p) !== 'locked' || !why?.stars || why.before) fail('chest with one star everywhere: ' + JSON.stringify(why));
  if (chapterStars(ch, p) !== chestAt) fail(`chapterStars ${chapterStars(ch, p)}, expected ${chestAt}`);
  p = withStars(p, nodes[1].id, 3);
  p = withStars(p, nodes[2].id, 3);
  if (nodeStatus(chest, p) !== 'open') fail('chest should open with enough stars: ' + JSON.stringify(lockReason(chest, p)));
  // withStars keeps the best and caps at the station's most.
  if (withStars(withStars(p, nodes[1].id, 1), nodes[1].id, 0).stars[nodes[1].id] !== 3) fail('withStars should keep the best');
  if (withStars(emptyProgress(), nodes[0].id, 3).stars[nodes[0].id] !== 1) fail('a lesson gives one star');
  if (chapterMaxStars(ch) !== c1.reduce((s, n) => s + maxStars(n), 0)) fail('chapterMaxStars');

  // Progress from before the map (schema 2): lessons watched, rounds played.
  const from = progressFromSkills({
    'count.to10': { level: 3, bestStars: 3, rounds: 2, lessonSeen: true },
    'compare.to10': { level: 1, bestStars: 2, rounds: 1, lessonSeen: true },
    'add.within10': { level: 2, bestStars: 1, rounds: 0, lessonSeen: false }
  });
  const want: Record<string, number> = { 'c1-count-lesson': 1, 'c1-count-5': 3, 'c1-count-10': 3, 'c1-compare-lesson': 1, 'c1-compare-5': 2 };
  if (JSON.stringify(from.stars) !== JSON.stringify(want)) fail('progressFromSkills: ' + JSON.stringify(from.stars));
  if (nextNode(from)?.id !== 'c1-compare-10') fail('after migration, next: ' + nextNode(from)?.id);
  if (Object.keys(from.chests).length) fail('chests are never opened by a migration');
  // A lesson watched out of order shows as done; the stations before it still come first.
  const odd = progressFromSkills({ 'add.within10': { level: 1, bestStars: 0, rounds: 0, lessonSeen: true } });
  if (nodeStatus(findNode('c1-add-lesson')!, odd) !== 'done' || nextNode(odd)?.id !== 'c1-count-lesson') fail('out of order: ' + JSON.stringify(odd));
  ok(`quest: 5 chapters, ${nodes.length} stations, each chapter from a lesson to its (stronger) boss, every new game at a station, ids unique, skills exist, every station reachable, opening only forward, star gates, migration from skills`);
}

// ---------- Word problems: placeholders the world fills (core/story.ts) ----------
{
  const words: StoryWords = { hero: 'גיבור הבדיקה', items: ['כדורים', 'פרחים'], place: ['במגרש'] };
  if (fillText('{place} יש {items} ל{hero}', words, 1) !== 'במגרש יש פרחים לגיבור הבדיקה') fail('fillText: ' + fillText('{place} יש {items} ל{hero}', words, 1));
  if (fillText('{items}', words, 0) !== fillText('{items}', words, 2)) fail('fillText: the pick wraps around the options');
  if (!hasPlaceholders('{nope}') || hasPlaceholders('אין כאן כלום')) fail('hasPlaceholders');
  if (fillText('{nope}', words) !== '{nope}') fail('an unknown placeholder stays (and the world check catches it)');
  const used = new Set<string>();
  let plus = 0;
  let minus = 0;
  for (const [sid, lv] of [...getSkill('story.within10')!.levels.map((l) => ['story.within10', l] as const), ...getSkill('story.within20')!.levels.map((l) => ['story.within20', l] as const)]) {
    for (let seed = 0; seed < 1000; seed++) {
      const q = makeQuestion(sid, lv.level, seed);
      const where = `${sid} L${lv.level} seed ${seed}`;
      for (const m of q.prompt.text.matchAll(/\{([a-z]+)\}/g)) {
        used.add(m[1]);
        if (!(PLACEHOLDERS as readonly string[]).includes(m[1])) fail(`${where}: unknown placeholder {${m[1]}}`);
      }
      if (!hasPlaceholders(q.prompt.text)) fail(`${where}: a story without the world's words: ${q.prompt.text}`);
      if (q.prompt.text !== q.prompt.speech) fail(`${where}: text and speech differ`);
      // A noun follows a number only from 2 up ("3 כדורים", never "1 כדורים").
      for (const m of q.prompt.text.matchAll(/(\d+) \{items\}/g)) if (Number(m[1]) < 2) fail(`${where}: "${m[0]}"`);
      // Neutral Hebrew: no verb that agrees with the child.
      if (/(תמצא|מצאת|תיקח|לקחת|לך |שלך)/.test(q.prompt.text)) fail(`${where}: speaks to the child by gender: ${q.prompt.text}`);
      const filled = fillQuestion(q, DEFAULT_WORDS);
      if (hasPlaceholders(filled.prompt.text) || hasPlaceholders(filled.prompt.speech)) fail(`${where}: placeholders left: ${filled.prompt.text}`);
      if (!sameAnswer(filled.answer, q.answer) || filled.prompt.math !== q.prompt.math || filled.key !== q.key) fail(`${where}: filling changed the math`);
      if (fillQuestion(q, DEFAULT_WORDS).prompt.text !== filled.prompt.text) fail(`${where}: filling is not reproducible`);
      if (q.prompt.math?.includes('+')) plus++;
      else minus++;
    }
  }
  // Money: the shop's {thing}, in every prompt, filled the same way.
  for (const lv of getSkill('money')!.levels)
    for (let seed = 0; seed < 300; seed++) {
      const q = makeQuestion('money', lv.level, seed);
      for (const p of [q.prompt, ...Object.values(q.prompts ?? {})]) for (const m of p!.text.matchAll(/\{([a-z]+)\}/g)) used.add(m[1]);
      const f = fillQuestion(q, DEFAULT_WORDS);
      for (const p of [f.prompt, ...Object.values(f.prompts ?? {})]) if (hasPlaceholders(p!.text) || hasPlaceholders(p!.speech)) fail(`money seed ${seed}: placeholders left: ${p!.text}`);
      if (!sameAnswer(f.answer, q.answer)) fail('money: filling changed the answer');
    }
  for (const p of PLACEHOLDERS) if (!used.has(p)) fail(`no story uses {${p}}`);
  if (plus < 400 || minus < 400) fail(`stories: ${plus} adding, ${minus} taking away`);
  // Other questions come back unchanged.
  const plain = makeQuestion('add.within10', 2, 7);
  if (fillQuestion(plain, DEFAULT_WORDS) !== plain) fail('a question without placeholders should come back as it is');
  ok(`word problems: ${PLACEHOLDERS.length} placeholders, stories filled with no {…} left, the math unchanged, a noun only after 2 or more, neutral Hebrew`);
}


// ---------- Mastery engine (core/mastery) ----------
const T0 = Date.UTC(2026, 9, 1, 8);
const right = (ms = 8000): AnswerResult => ({ correct: true, wrongBefore: 0, ms });
const afterHint: AnswerResult = { correct: true, wrongBefore: 1, ms: 9000, errorTags: ['count-off-by-one'] };
const shownR: AnswerResult = { correct: false, wrongBefore: 2, ms: 15000, errorTags: ['added', 'count-off-by-one'] };
{
  let s = emptyMastery();
  const up = updateMastery(s, right(), T0);
  if (!(up.mastery > 0)) fail('mastery: a right answer should raise it');
  const quick = updateMastery(s, right(2000), T0);
  const slow = updateMastery(s, right(30000), T0);
  if (!(quick.mastery > up.mastery && up.mastery > slow.mastery)) fail(`mastery: quick ${quick.mastery} > normal ${up.mastery} > slow ${slow.mastery}`);
  const hinted = updateMastery(s, afterHint, T0);
  if (!(hinted.mastery > 0 && hinted.mastery < slow.mastery)) fail(`mastery: right after a hint should raise less (${hinted.mastery})`);
  const high = { ...emptyMastery(), mastery: 0.8, attempts: 10 };
  const down = updateMastery(high, shownR, T0);
  if (!(down.mastery < 0.8)) fail('mastery: a shown answer should lower it');
  if (down.errorCounts.added !== 1 || down.errorCounts['count-off-by-one'] !== 1) fail('mastery: mistakes counted by kind ' + JSON.stringify(down.errorCounts));
  // Steady right answers reach "mastered", never above 1; quick ones sooner.
  let n = 0;
  for (s = emptyMastery(); !isMastered(s) && n < 50; n++) s = updateMastery(s, right(), T0 + n);
  let nq = 0;
  for (s = emptyMastery(); !isMastered(s) && nq < 50; nq++) s = updateMastery(s, right(1500), T0 + nq);
  if (n < 5 || n > 9 || nq >= n) fail(`mastery: ${n} right answers (${nq} quick) to reach ${MASTERED}`);
  for (let i = 0; i < 100; i++) s = updateMastery(s, right(1000), T0);
  if (s.mastery > 1 || s.mastery < 0.99) fail('mastery stays in 0..1');
  for (let i = 0; i < 100; i++) s = updateMastery(s, shownR, T0);
  if (s.mastery < 0 || s.mastery > 0.01) fail('mastery stays in 0..1 going down');
  // Bookkeeping: attempts, the last 10 results, the average time, total time.
  s = emptyMastery();
  for (let i = 0; i < 14; i++) s = updateMastery(s, i % 2 ? right(4000) : afterHint, T0 + i);
  if (s.attempts !== 14 || s.recentResults.length !== 10 || s.recentResults.at(-1) !== true || s.recentResults.at(-2) !== false) fail('mastery: attempts / recent results ' + JSON.stringify(s));
  if (!(s.avgTimeMs > 4000 && s.avgTimeMs < 9000) || s.totalMs !== 7 * 4000 + 7 * 9000 || s.lastPracticed !== T0 + 13) fail(`mastery: time ${s.avgTimeMs} / ${s.totalMs}`);
  if (updateMastery(emptyMastery(), right(10 * 60_000), T0).totalMs !== 60_000) fail('a very long answer counts as a minute');
  if (commonError(s.errorCounts) !== 'count-off-by-one' || commonError({ added: 1 }) !== undefined || commonError({ added: 2, 'one-part': 5 }) !== 'one-part') fail('commonError');
  // Normalizing old or broken records.
  const norm = normalizeMastery({ mastery: 7, attempts: -1, recentResults: [true, 'x' as unknown as boolean], errorCounts: { added: 2, near: -3 } as never, reviewStep: 9 });
  if (norm.mastery !== 0 || norm.attempts !== 0 || norm.recentResults.length !== 1 || norm.errorCounts.added !== 2 || 'near' in norm.errorCounts || norm.reviewStep !== -1) fail('normalizeMastery ' + JSON.stringify(norm));
  if (JSON.stringify(normalizeMastery(undefined)) !== JSON.stringify(emptyMastery())) fail('normalizeMastery(undefined)');
  ok(`mastery: right raises, wrong lowers, quick > normal > slow > after a hint; mastered after ${n} steady (${nq} quick) answers; mistakes by kind, the last 10, time`);
}

// Spaced review with an injected clock: 1 → 3 → 7 → 14 → 30 days; a mistake shortens.
{
  let s: MasteryFields = emptyMastery();
  let t = T0;
  const gaps: number[] = [];
  for (let i = 0; i < 7; i++) {
    s = updateMastery(s, right(), t);
    gaps.push(Math.round((s.nextReview - t) / DAY));
    // Right again the same day: not due, nothing moves.
    const same = updateMastery(s, right(), t + 3600_000);
    if (same.nextReview !== s.nextReview) fail('review: a second success before the date moves nothing');
    if (isDue(s, t + 1000) || !isDue(s, s.nextReview)) fail('review: isDue');
    t = s.nextReview + 3600_000;
  }
  if (gaps.join() !== '1,3,7,14,30,30,30') fail('review gaps ' + gaps.join());
  // A mistake brings it closer: one gap back, from now.
  const before = s.reviewStep;
  const slip = updateMastery(s, shownR, t - 20 * DAY);
  if (slip.reviewStep !== before - 1 || slip.nextReview !== t - 20 * DAY + REVIEW_DAYS[before - 1] * DAY) fail(`review: a mistake shortens (${slip.reviewStep}, ${(slip.nextReview - t) / DAY})`);
  // A mistake on a due skill schedules it from now (it is no longer due right after a review).
  const due = { ...emptyMastery(), attempts: 3, nextReview: T0 - DAY, reviewStep: 2 };
  const after = updateMastery(due, shownR, T0);
  if (isDue(after, T0) || after.nextReview !== T0 + REVIEW_DAYS[1] * DAY) fail('review: a mistake on a due skill');
  const firstSlip = updateMastery(emptyMastery(), shownR, T0);
  if (firstSlip.nextReview !== T0 + DAY) fail('review: the first answer, wrong, comes back tomorrow');
  // dueSkills: the most overdue first; never-played skills are not due.
  const states: Record<string, MasteryFields> = {
    'add.within10': { ...emptyMastery(), attempts: 5, nextReview: T0 - 2 * DAY },
    'sub.within10': { ...emptyMastery(), attempts: 5, nextReview: T0 - 5 * DAY },
    'count.to10': { ...emptyMastery(), attempts: 5, nextReview: T0 + DAY },
    'compare.to10': emptyMastery()
  };
  if (dueSkills(states, T0).join() !== 'sub.within10,add.within10') fail('dueSkills ' + dueSkills(states, T0).join());
  if (dueSkills(states, T0 + 2 * DAY).length !== 3) fail('dueSkills two days later');
  ok('spaced review: 1 → 3 → 7 → 14 → 30 days by the injected clock, only when due; a mistake shortens; due skills by date');
}

// The level inside a round: 3 right → up; 2 wrong → down + early hints; a station stays.
{
  let lv = startLevelState(1);
  const seq = (answers: boolean[], max = 3, fixed = false) => {
    const levels: number[] = [];
    let st = lv;
    for (const a of answers) {
      st = adaptLevel(st, a, max, fixed);
      levels.push(st.level);
    }
    return { st, levels };
  };
  let r = seq([true, true, true, true, true, true, true, true]);
  if (r.levels.join() !== '1,1,2,2,2,3,3,3') fail('adaptive: up after 3 in a row ' + r.levels.join());
  r = seq([true, true, false, true, true, true]);
  if (r.levels.join() !== '1,1,1,1,1,2') fail('adaptive: a mistake breaks the run ' + r.levels.join());
  lv = startLevelState(3);
  r = seq([false, true, false, false, false]);
  if (r.levels.join() !== '3,3,3,2,2' || !r.st.earlyHint) fail('adaptive: down after 2 wrong in a row, with early hints ' + r.levels.join());
  const calm = adaptLevel(adaptLevel(r.st, true, 3), true, 3);
  if (calm.earlyHint) fail('adaptive: 2 right in a row end the early hints');
  if (!adaptLevel(r.st, true, 3).earlyHint) fail('adaptive: one right answer keeps the early hints');
  lv = startLevelState(1);
  r = seq([false, false]);
  if (r.st.level !== 1 || !r.st.earlyHint) fail('adaptive: never below level 1, but hints come early');
  lv = startLevelState(2);
  r = seq([true, true, true, false, false], 3, true);
  if (r.levels.some((x) => x !== 2) || !r.st.earlyHint) fail('adaptive: a station keeps its level (early hints still) ' + r.levels.join());
  lv = startLevelState(3);
  if (seq([true, true, true]).st.level !== 3) fail('adaptive: never above the top level');
  ok('adaptive level: 3 right in a row → up, 2 wrong → down + early hint (2 right end it), level 1..max, a station stays');
}

// Questions weighted by the child's common mistake (1,000 seeds per case), still valid and new.
{
  const cases: [SkillId, number, ErrorTag][] = [
    ['add.within10', 3, 'count-off-by-one'],
    ['sub.within10', 3, 'added'],
    ['add.within10', 3, 'subtracted'],
    ['sub.within10', 2, 'one-part'],
    ['count.to10', 3, 'count-off-by-one'],
    ['compare.to10', 2, 'reversed-sign'],
    ['compare.to10', 2, 'not-equal'],
    ['story.within10', 2, 'count-off-by-one'],
    // Phase 7: every new kind of mistake.
    ['add.within20', 2, 'no-bridge'],
    ['sub.within20', 2, 'no-bridge'],
    ['add.within100', 2, 'swapped-digits'],
    ['sub.within100', 1, 'tens-as-ones'],
    ['numbers.to100', 3, 'swapped-digits'],
    ['place.value', 2, 'swapped-digits'],
    ['pattern', 2, 'wrong-step'],
    ['clock', 2, 'hands-swapped'],
    ['money', 3, 'added']
  ];
  const lines: string[] = [];
  for (const [skill, level, tag] of cases) {
    let plain = 0;
    let weighted = 0;
    let total = 0;
    for (let seed = 0; seed < 1000; seed++) {
      const a = makeAdaptiveRound(skill, level, seed, 8);
      const b = makeAdaptiveRound(skill, level, seed, 8, tag);
      for (const [round, which] of [
        [a, 'plain'],
        [b, 'weighted']
      ] as const) {
        if (new Set(round.map((q) => q.key)).size !== round.length) fail(`${skill} ${which} seed ${seed}: an exercise twice`);
        for (let i = 1; i < round.length; i++) if (sameAnswer(round[i].answer, round[i - 1].answer)) fail(`${skill} ${which} seed ${seed}: the same answer twice in a row`);
        for (const q of round) if (q.level !== level || q.skillId !== skill) fail(`${skill} ${which}: wrong level/skill`);
      }
      plain += a.filter((q) => invites(q, tag)).length;
      weighted += b.filter((q) => invites(q, tag)).length;
      total += 8;
      if (JSON.stringify(makeAdaptiveRound(skill, level, seed, 8, tag).map((q) => q.id)) !== JSON.stringify(b.map((q) => q.id))) fail(`${skill}: not reproducible by seed`);
    }
    const p = plain / total;
    const w = weighted / total;
    // The pool limits it (count to 10 has only five "many to count" exercises, none twice).
    if (!(w >= p + 0.08 || w >= 0.85)) fail(`${skill}/${tag}: weighted ${(w * 100).toFixed(0)}% vs plain ${(p * 100).toFixed(0)}%`);
    lines.push(`${skill.split('.')[0]}/${tag} ${(p * 100).toFixed(0)}→${(w * 100).toFixed(0)}%`);
  }
  // invites: a few by hand.
  const q = (key: string, tags: Record<string, ErrorTag> = {}) => ({ key, errorTags: tags, answer: 0 });
  if (!invites(q('6+1'), 'count-off-by-one') || invites(q('4+4'), 'count-off-by-one') || !invites(q('count:8'), 'count-off-by-one') || invites(q('count:3'), 'count-off-by-one')) fail('invites: counting slips');
  if (!invites(q('5-2', { '7': 'added' }), 'added') || invites(q('5-4', {}), 'added')) fail('invites: added');
  if (!invites(q('3?4'), 'reversed-sign') || invites(q('4?4'), 'reversed-sign') || !invites(q('4?4'), 'not-equal')) fail('invites: signs');
  if (!invites(q('8+5'), 'no-bridge') || invites(q('8+2'), 'no-bridge') || !invites(q('13-5'), 'no-bridge') || invites(q('17-4'), 'no-bridge')) fail('invites: no-bridge');
  if (!invites(q('38+25'), 'no-carry') || invites(q('34+25'), 'no-carry') || !invites(q('52-17'), 'no-borrow') || invites(q('58-23'), 'no-borrow')) fail('invites: carry and borrow');
  // Every new kind of mistake (phase 7) a generator makes is invited by some question of its skill.
  const NEW_TAGS: ErrorTag[] = ['no-bridge', 'swapped-digits', 'tens-as-ones', 'no-carry', 'no-borrow', 'wrong-step', 'hands-swapped'];
  for (const sk of SKILLS)
    for (const lv of sk.levels) {
      const offered = new Set<ErrorTag>();
      const invited = new Set<ErrorTag>();
      for (let seed = 0; seed < 200; seed++) {
        const x = makeQuestion(sk.id, lv.level, seed);
        for (const t of Object.values(x.errorTags)) {
          if (!NEW_TAGS.includes(t)) continue;
          offered.add(t);
          if (invites(x, t)) invited.add(t);
        }
      }
      for (const t of offered) if (!invited.has(t)) fail(`invites: no ${sk.id} L${lv.level} question invites "${t}"`);
    }
  // pickQuestion keeps away from the keys given.
  const avoid = new Set(['1+1', '1+2', '2+1']);
  const rng = createRng(5);
  for (let i = 0; i < 300; i++) if (avoid.has(pickQuestion('add.within10', 1, rng, avoid).key)) fail('pickQuestion: an avoided exercise');
  ok(`weighted questions over 1,000 seeds: ${lines.join(', ')}; no repeats, same seed = same round`);
}

// A question whose answer was shown comes back: a sister with the same kind of mistake, or itself.
{
  let sisters = 0;
  let same = 0;
  for (let seed = 0; seed < 1000; seed++) {
    const q = makeQuestion('sub.within10', 3, seed);
    const tag = Object.values(q.errorTags)[0];
    const s = sisterOf(q, tag, seed, new Set([q.key]));
    if (s.key === q.key) same++;
    else {
      sisters++;
      if (!Object.values(s.errorTags).includes(tag) || s.level !== q.level || s.skillId !== q.skillId) fail(`sisterOf seed ${seed}: not a sister`);
    }
    if (sisterOf(q, tag, seed, new Set([q.key])).id !== s.id) fail('sisterOf: not reproducible');
  }
  if (sisters < 950) fail(`sisterOf: only ${sisters} sisters (${same} the same)`);
  // Nothing else to find: the same question comes back.
  const only = makeQuestion('compare.to10', 1, 3);
  const all = new Set<string>();
  for (let a = 0; a <= 5; a++) for (let b = 0; b <= 5; b++) all.add(`${a}?${b}`);
  all.delete(only.key);
  if (sisterOf(only, 'reversed-sign', 1, all).key !== only.key) fail('sisterOf: falls back to the same question');
  ok(`comebacks: ${sisters}/1000 sisters with the same kind of mistake, else the same question`);
}

// pickHint by history: the child's common mistake chooses the hint when the mistake itself has none.
{
  const q = makeQuestion('add.within10', 3, 11);
  const offByOne = q.hints.find((h) => h.for?.includes('count-off-by-one'))!;
  const parts = q.hints.find((h) => h.for?.includes('subtracted'))!;
  if (pickHint(q, undefined, 'count-off-by-one') !== offByOne) fail('pickHint: an early hint fits the common mistake');
  if (pickHint(q, undefined) !== q.hints[0]) fail('pickHint: no history → the default');
  const wrongSub = Object.entries(q.errorTags).find(([, t]) => t === 'subtracted');
  if (wrongSub && pickHint(q, Number(wrongSub[0]), 'count-off-by-one') !== parts) fail('pickHint: the mistake itself first');
  const near = { ...q, errorTags: { '99': 'near' as ErrorTag } };
  if (pickHint(near, 99, 'count-off-by-one') !== offByOne) fail('pickHint: a mistake with no hint of its own → the common one');
  if (pickHint(near, 99, 'reversed-sign') !== q.hints[0]) fail('pickHint: a common mistake with no hint here → the default');
  ok('pickHint: the mistake made, else the child\'s common mistake, else the default');
}

// The placement game: a child who knows skips ahead, one who does not stays at the start.
{
  const levelsOf = (id: SkillId) => getSkill(id)!.levels.length;
  const run = (band: AgeBand, knows: (rung: number) => boolean) => {
    let st: PlacementState = startPlacement(band);
    const asked: number[] = [];
    while (!st.done) {
      asked.push(st.at);
      st = placementStep(st, knows(st.at));
      if (asked.length > 10) break;
    }
    return { st, asked, r: placementResult(st, levelsOf) };
  };
  const top = LADDER.length - 1;
  for (const band of ['4-5', '6-7', '8-9', '10-12'] as AgeBand[]) {
    const knower = run(band, () => true);
    const ladderSkills = new Set(LADDER.map((r) => r.skillId)).size;
    if (knower.r.known !== top || knower.r.mastered.length !== ladderSkills || knower.asked.length > 10) fail(`placement ${band}: the knower ${JSON.stringify(knower)}`);
    const not = run(band, () => false);
    if (not.r.known !== -1 || not.r.mastered.length || Object.keys(not.r.partial).length || not.asked.length > 5) fail(`placement ${band}: the beginner ${JSON.stringify(not)}`);
  }
  // Start by age up to second grade: kindergarten at counting, first grade at adding to 10, second at chapter 2.
  if (startPlacement(5).at !== 0 || startPlacement(6).at !== 3 || startPlacement(7).at !== 7 || startPlacement(9).at !== 9) fail('placement start by age');
  for (const age of [5, 6, 7, 9]) {
    const k = run(age as unknown as AgeBand, () => true);
    if (k.asked.length > 10 || k.r.known !== top) fail(`placement age ${age}: the knower took ${k.asked.length}`);
  }
  // Every edge is found: a child who knows everything up to rung k.
  for (const band of ['4-5', '6-7', '8-9', 7] as AgeBand[])
    for (let k = -1; k <= top; k++) {
      const x = run(band, (i) => i <= k);
      if (x.r.known !== k || x.asked.length > 10) fail(`placement ${band}, knows up to ${k}: known ${x.r.known} after ${x.asked.length} (${x.asked.join(',')})`);
    }
  // One slip from a knower still places far ahead (but not past the slip).
  const slip = run('8-9', (i) => i !== 6);
  if (slip.r.known < 5) fail('placement: one slip ' + JSON.stringify(slip));
  // Never more than 10 questions, whatever the answers (random children).
  const rng = createRng(3);
  for (let i = 0; i < 1000; i++) {
    const x = run(['4-5', '6-7', '8-9'][i % 3] as AgeBand, () => rng.next() < 0.6);
    if (x.asked.length > 10 || !x.st.done) fail('placement: more than 10 questions');
    if (x.r.known >= 0 && !x.st.passed.includes(x.r.known)) fail('placement: known rung was never passed');
  }
  if (knownRung({ passed: [4, 6], failed: [5] }) !== 4 || knownRung({ passed: [4, 5, 6], failed: [5] }) !== 6) fail('knownRung');
  // Up to "add to 7": counting and comparing mastered, adding partly (next level 3), not taking away.
  const mid = placementResult({ passed: [5], failed: [6] }, levelsOf);
  if (mid.mastered.join() !== 'count.to10,compare.to10,add.within10' || mid.partial['sub.within10'] !== 3 || mid.partial['add.within20']) fail('placementResult ' + JSON.stringify(mid));
  if (!rungKnown('count.to10', 2, 1) || rungKnown('add.within10', 3, 4) || !rungKnown('add.within10', 2, 4)) fail('rungKnown');
  // Word problems are known with the sums they tell.
  if (!rungKnown('story.within20', 2, 10) || rungKnown('story.within20', 1, 9) || !rungKnown('story.within10', 2, 6)) fail('rungKnown: implied skills');
  // On the map: the stations known are done, a chest skipped past is open, the boss is not.
  const known = (id: SkillId, level: number) => rungKnown(id, level, 4);
  const p = progressFromPlacement(emptyProgress(), known);
  const next = nextNode(p);
  if (next?.id !== 'c1-add-10' || p.stars['c1-sub-7'] !== 3 || p.stars['c1-count-lesson'] !== 1 || !p.chests['c1-chest'] || p.stars['c1-boss']) fail('placement on the map (up to taking away to 7): ' + JSON.stringify(p) + ' next ' + next?.id);
  // Everything: every chapter's boss passed (one star), the hero at the last boss of the journey.
  const all = progressFromPlacement(emptyProgress(), (id, level) => rungKnown(id, level, top));
  if (nextNode(all)?.id !== 'c5-boss' || !all.chests['c4-chest'] || all.stars['c5-boss'] || all.stars['c1-boss'] !== 1 || all.stars['c4-boss'] !== 1) fail('placement on the map (everything): next ' + nextNode(all)?.id);
  // Everything to 20 (chapters 1–2): the hero starts chapter 3.
  const to20 = run(7 as unknown as AgeBand, (i) => i <= 12);
  if (to20.r.known !== 12 || to20.asked.length > 10) fail('placement: knows to 20 ' + JSON.stringify(to20));
  const p20 = progressFromPlacement(emptyProgress(), (id, level) => rungKnown(id, level, to20.r.known));
  if (nextNode(p20)?.id !== 'c3-n100-lesson' || p20.stars['c2-boss'] !== 1 || p20.stars['c2-story-1'] !== 3) fail('placement on the map (to 20): next ' + nextNode(p20)?.id);
  const none = progressFromPlacement(emptyProgress(), () => false);
  if (nextNode(none)?.id !== 'c1-count-lesson' || Object.keys(none.stars).length) fail('placement on the map (nothing)');
  // Never takes stars away.
  const had = withStars(withStars(emptyProgress(), 'c1-count-lesson', 1), 'c1-count-5', 2);
  if (progressFromPlacement(had, () => false).stars['c1-count-5'] !== 2) fail('placement took stars away');
  ok(`placement: a ladder of ${LADDER.length} through 5 chapters; the knower reaches the last boss in ≤ 10 questions, "knows to 20" lands at chapter 3, the beginner stays at the start, every edge found in ≤ 10, bosses of known chapters passed`);
}

// The review station: made on the fly, never a chapter's station; mixes skills.
{
  const r = reviewNode(['add.within10']);
  if (r.id !== REVIEW_ID || r.kind !== 'review' || r.count !== 6 || findNode(REVIEW_ID) || maxStars(r) !== 3) fail('reviewNode');
  if (reviewSkills(['add.within10'], ['count.to10', 'add.within10']).join() !== 'add.within10,count.to10') fail('reviewSkills fills to two skills');
  if (reviewSkills(['a', 'b', 'c', 'd'] as SkillId[], []).length !== 3) fail('reviewSkills: at most 3');
  const bad = { id: 'x', chapters: [{ id: 'c', title: 'c', sections: [{ id: 's', title: 's', nodes: [r] }] }] };
  if (!journeyProblems(bad, () => true).some((x) => x.includes('review'))) fail('journeyProblems: a review station in a chapter');
  ok('review station: made on the fly (id "review", 6 questions), not a chapter station, 2–3 skills');
}

// Recommendations by mastery and the summary for parents.
{
  const st = (m: number, attempts: number, nextReview = 0, errorCounts = {}): MasteryFields => ({ ...emptyMastery(), mastery: m, attempts, nextReview, errorCounts, totalMs: attempts * 5000, lastPracticed: T0 });
  const byAge: SkillId[] = ['add.within10', 'sub.within10'];
  if (recommendByMastery(SKILLS, {}, byAge, T0).join() !== 'add.within10,sub.within10') fail('recommend: a new child gets the age list');
  const states = { 'count.to10': st(0.95, 20, T0 - DAY), 'compare.to10': st(0.9, 12, T0 + DAY), 'add.within10': st(0.4, 6, T0 + DAY, { 'count-off-by-one': 4, added: 1 }) };
  const rec = recommendByMastery(SKILLS, states, byAge, T0);
  if (rec.join() !== 'count.to10,add.within10') fail('recommend: due first, then the one being learned: ' + rec.join());
  const later = recommendByMastery(SKILLS, { 'count.to10': st(0.95, 20, T0 + 9 * DAY), 'compare.to10': st(0.9, 12, T0 + 9 * DAY), 'add.within10': st(0.9, 30, T0 + 9 * DAY) }, byAge, T0 + 2 * DAY);
  if (!later.includes('sub.within10')) fail('recommend: a new skill whose prerequisites are mastered: ' + later.join());
  const sum = summarize(states, T0);
  if (sum.mastered.join() !== 'count.to10,compare.to10' || sum.hard[0]?.skillId !== 'add.within10' || sum.hard[0].tag !== 'count-off-by-one' || sum.practiceMs !== 38 * 5000 || sum.attempts !== 38) fail('summary ' + JSON.stringify(sum));
  if (!sum.skills.find((x) => x.skillId === 'count.to10')?.due) fail('summary: due');
  ok('recommendations: due for review first, then what is being learned, then what is ready; summary: mastered, hard (by mistakes), time');
}

// Phase 8: the parents' area, pure.
{
  // Every kind of mistake in parents' words, a male and a female form and a tip.
  const heb = /[\u05d0-\u05ea]/;
  for (const t of ERROR_TAGS) {
    const e = PARENT_ERRORS[t];
    if (!e || !heb.test(e.m) || !heb.test(e.f) || !heb.test(e.tip)) fail(`parents' words for ${t}`);
  }
  if (Object.keys(PARENT_ERRORS).length !== ERROR_TAGS.length) fail('PARENT_ERRORS has extra tags');

  // Days: local dates, a week across a month's end, answers capped at a minute.
  const noon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
  const now = noon(2026, 10, 3);
  if (dayKey(now) !== '2026-10-03') fail('dayKey');
  const week = lastDays(now, 7);
  if (week.join() !== '2026-09-27,2026-09-28,2026-09-29,2026-09-30,2026-10-01,2026-10-02,2026-10-03') fail('lastDays ' + week.join());
  if (lastDays(now, KEEP_DAYS).length !== KEEP_DAYS) fail('lastDays 90');
  if (staleDays(['2026-06-01', '2026-07-05', '2026-10-01'], now).join() !== '2026-06-01,2026-07-05') fail('staleDays ' + staleDays(['2026-06-01', '2026-07-05', '2026-10-01'], now));
  if (weekdayLabel('2026-10-03') !== 'ש׳' || weekdayLabel('2026-10-04') !== 'א׳') fail('weekdayLabel');
  let log = emptyDayLog('p', '2026-10-03');
  log = addAnswer(log, 8000, true);
  log = addAnswer(log, 5 * 60_000, false);
  if (log.ms !== 68_000 || log.questions !== 2 || log.right !== 1) fail('addAnswer ' + JSON.stringify(log));
  const bad = normalizeDayLog({ ms: -5, questions: 3, right: 9, goalAt: NaN } as never, 'p', '2026-10-03');
  if (bad.ms !== 0 || bad.right !== 3 || bad.goalAt !== 0) fail('normalizeDayLog ' + JSON.stringify(bad));
  const logs = [
    { ...emptyDayLog('p', '2026-10-03'), ms: 10 * 60_000, questions: 30, right: 25 },
    { ...emptyDayLog('p', '2026-09-29'), ms: 5 * 60_000, questions: 12, right: 10 },
    { ...emptyDayLog('p', '2026-09-20'), ms: 99 * 60_000, questions: 99, right: 99 },
    { ...emptyDayLog('q', '2026-10-03'), ms: 77 * 60_000, questions: 77, right: 77 }
  ];
  const ts = timeStats(logs, 'p', now);
  if (ts.today.questions !== 30 || ts.weekMs !== 15 * 60_000 || ts.weekQuestions !== 42 || ts.weekDays !== 2 || ts.week.length !== 7 || ts.week[6].day !== '2026-10-03') fail('timeStats ' + JSON.stringify(ts));
  if (timeStats(logs, 'p', noon(2026, 10, 4)).today.questions !== 0) fail('timeStats: a new day starts empty');
  if (durationText(0) !== '0 דק׳' || durationText(20_000) !== 'פחות מדקה' || durationText(12 * 60_000) !== '12 דק׳' || durationText(65 * 60_000) !== '1 שע׳ 5 דק׳' || durationText(120 * 60_000) !== '2 שע׳') fail('durationText');

  // The daily goal and the break.
  if (normalizeGoal({ kind: 'questions', amount: 20 })?.amount !== 20 || normalizeGoal({ kind: 'laps', amount: 3 }) || normalizeGoal({ kind: 'minutes', amount: 0 }) || normalizeGoal(null)) fail('normalizeGoal');
  const gq = goalProgress({ kind: 'questions', amount: 20 }, { ms: 0, questions: 10 });
  const gm = goalProgress({ kind: 'minutes', amount: 10 }, { ms: 12 * 60_000, questions: 3 });
  if (gq.ratio !== 0.5 || gq.reached || !gm.reached || gm.ratio !== 1) fail('goalProgress');
  const t = 1_000_000_000;
  if (breakDue(null, t, 0, t + 3_600_000) || breakDue(15, t, 0, t + 14 * 60_000) || !breakDue(15, t, 0, t + 15 * 60_000) || breakDue(15, t, t + 15 * 60_000, t + 20 * 60_000)) fail('breakDue');

  // The journey and the skills as parents see them.
  const start = journeyView(emptyProgress());
  if (start.chapter?.index !== 0 || start.station !== allNodes()[0].title || start.bossesBeaten !== 0 || !start.chapters[0].reached || start.chapters[1].reached) fail('journeyView at the start ' + JSON.stringify(start.chapter));
  let all = emptyProgress();
  for (const n of allNodes()) all = n.kind === 'chest' ? { ...all, chests: { ...all.chests, [n.id]: n.prize.icon } } : withStars(all, n.id, 3);
  const end = journeyView(all);
  if (end.chapter !== null || end.station !== null || end.bossesBeaten !== JOURNEY.chapters.length || end.chapters.some((c) => c.stars !== c.maxStars)) fail('journeyView at the end');
  const byCh = skillsByChapter({ 'count.to10': { ...emptyMastery(), mastery: 0.9, attempts: 20, level: 2 }, 'add.within10': { ...emptyMastery(), mastery: 0.4, attempts: 5, level: 1 } });
  const ids = byCh.flatMap((c) => c.skills.map((x) => x.skillId));
  if (ids.length !== SKILLS.length || new Set(ids).size !== SKILLS.length) fail('skillsByChapter: every skill once ' + ids.length);
  if (byCh[0].skills[0].skillId !== 'count.to10' || byCh[0].skills[0].status !== 'mastered' || !byCh[0].skills[0].levelLabel) fail('skillsByChapter: first chapter ' + JSON.stringify(byCh[0].skills[0]));
  const c = statusCounts(byCh);
  if (c.mastered !== 1 || c.learning !== 1 || c.new !== SKILLS.length - 2) fail('statusCounts ' + JSON.stringify(c));
  if (skillStatus(undefined) !== 'new' || skillStatus({ mastery: 0, attempts: 1 }) !== 'learning') fail('skillStatus');
  // The parents' settings at work: games turned off, free practice kept to the journey, a chapter opened by hand.
  if (allowedTemplates(['pop', 'jump', 'match'], ['match']).join() !== 'pop,jump' || allowedTemplates(['jump'], ['jump']).join() !== 'pop') fail('allowedTemplates');
  if (stationTemplate('match', ['match']) !== 'pop' || stationTemplate('jump', ['match']) !== 'jump' || stationTemplate(undefined, ['match']) !== undefined) fail('stationTemplate');
  const fresh = emptyProgress();
  const ch1 = JOURNEY.chapters[0];
  const ch3 = JOURNEY.chapters[2];
  if (reachedChapters(fresh).join() !== ch1.id) fail('reachedChapters at the start: ' + reachedChapters(fresh));
  if (practiceSkills(fresh, false).length !== SKILLS.length) fail('practiceSkills: all when not locked');
  const early = practiceSkills(fresh, true);
  if (!early.includes('add.within10') || early.includes('add.within100') || early.length >= SKILLS.length) fail('practiceSkills locked at the start: ' + early.join());
  const first3 = chapterNodes(ch3)[0];
  if (nodeStatus(first3, fresh) !== 'locked') fail('chapter 3 starts locked');
  const opened = { ...fresh, opened: [ch3.id] };
  if (nodeStatus(first3, opened) !== 'open' || nodeStatus(chapterNodes(ch3)[1], opened) !== 'locked') fail('a chapter opened by hand: its first station opens, the rest follow as usual');
  if (nextNode(opened)?.id !== allNodes()[0].id) fail('opening a chapter ahead leaves the next station where it was');
  if (!reachedChapters(opened).includes(ch3.id) || !practiceSkills(opened, true).some((id) => chapterNodes(ch3).some((n) => (n.kind === 'practice' || n.kind === 'lesson') && n.skillId === id))) fail('an opened chapter counts as reached for practice');
  ok(`parents: ${ERROR_TAGS.length} mistakes in parents' words (m/f + tip), days and weeks with an injected clock (90 days kept), daily goal and break, journey and skills by chapter, games turned off (Pop stays), practice kept to the journey, a chapter opened by hand`);
}

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nall core checks passed');
