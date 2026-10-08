// Learning Core checks that need no browser: `bun tests/core/check.ts`
// The seeded RNG; every generator over 1,000 seeds at every level (right answer, unique
// distractors, everything in the level's range, no negatives, same seed = same question);
// skills and recommendations; round scoring. Phase 6 adds the mastery engine.
import { createRng } from '../../src/core/rng';
import { SKILLS, getSkill, recommendedSkills, startLevel } from '../../src/core/skills/index';
import { GENERATORS, findQuestion, makeQuestion, makeRound } from '../../src/core/generators/index';
import { LESSONS, getLesson } from '../../src/core/lessons/index';
import { MAX_WRONG, nextLevel, questionPoints, starsFor } from '../../src/core/round';
import { JOURNEY, allNodes, chapterMaxStars, chapterStars, emptyProgress, findNode, journeyProblems, lockReason, maxStars, nextNode, nodeStatus, progressFromSkills, withStars, type QuestProgress } from '../../src/core/quest/index';
import { DEFAULT_WORDS, PLACEHOLDERS, fillQuestion, fillText, hasPlaceholders, type StoryWords } from '../../src/core/story';
import { ACTION_KINDS, actionResult, actionValid, isCorrect, pickHint, type Action, type Answer, type Question, type Step, type Visual } from '../../src/core/types';

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
  if (end !== answer) return `the explanation ends on ${end}, the answer is ${answer}`;
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
    [{ kind: 'compare', a: 3, b: 3 }, '=']
  ];
  for (const [a, want] of cases) {
    if (actionResult(a) !== want) fail(`actionResult(${JSON.stringify(a)}) = ${actionResult(a)}, expected ${want}`);
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
    { kind: 'tenFrame', n: 2.5 }
  ];
  for (const a of bad) if (actionValid(a)) fail(`${JSON.stringify(a)} should be invalid`);
  ok('actions: results and limits (0–10)');
}

// ---------- Generators: 1,000 seeds per skill and level ----------
{
  const SIGNS = ['<', '>', '='];
  /** The value an exercise stands for, computed independently of the generator. */
  function solve(q: Question): Answer {
    const m = q.prompt.math ?? '';
    let r: RegExpExecArray | null;
    if ((r = /^(\d+) \+ (\d+) = \?$/.exec(m))) return Number(r[1]) + Number(r[2]);
    if ((r = /^(\d+) − (\d+) = \?$/.exec(m))) return Number(r[1]) - Number(r[2]);
    if ((r = /^(\d+) \? (\d+)$/.exec(m))) {
      const [a, b] = [Number(r[1]), Number(r[2])];
      return a > b ? '>' : a < b ? '<' : '=';
    }
    if (!m && q.prompt.visual) return q.prompt.visual.groups[0];
    throw new Error(`cannot read exercise "${m}"`);
  }
  function visualOk(v: Visual | undefined, q: Question): boolean {
    if (!v) return true;
    return v.groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 10) && (v.crossed ?? 0) <= v.groups.at(-1)!;
  }
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
        const want = skill.generatorId === 'compare' ? 2 : 3;
        if (q.answer !== solve(q)) err(`answer ${q.answer}, exercise says ${solve(q)}`);
        if (!isCorrect(q, q.answer)) err('isCorrect(answer) is false');
        if (q.distractors.length !== want) err(`${q.distractors.length} distractors, expected ${want}`);
        if (new Set(q.distractors.map(String)).size !== q.distractors.length) err(`repeated distractors ${q.distractors}`);
        if (q.distractors.some((d) => d === q.answer)) err('a distractor equals the answer');
        if (q.distractors.some((d) => isCorrect(q, d))) err('a distractor counts as correct');
        if (q.choices.length !== want + 1 || !q.choices.includes(q.answer) || q.distractors.some((d) => !q.choices.includes(d))) err(`choices ${q.choices}`);
        for (const d of q.distractors) if (!q.errorTags[String(d)]) err(`no error tag for ${d}`);
        const nums = [q.answer, ...q.distractors].filter((x): x is number => typeof x === 'number');
        if (q.numeric) {
          if (typeof q.answer !== 'number') err('numeric question with a non-number answer');
          for (const n of nums) if (!Number.isInteger(n) || n < 0 || n < lv.min || n > lv.max) err(`${n} outside ${lv.min}..${lv.max} or negative`);
        } else if ([q.answer, ...q.distractors].some((x) => !SIGNS.includes(String(x)))) err('comparison choices must be signs');
        const inMath = (q.prompt.math ?? '').match(/\d+/g)?.map(Number) ?? [];
        for (const n of inMath) if (n < lv.min || n > lv.max || n < 0) err(`exercise number ${n} outside ${lv.min}..${lv.max}`);
        if (!visualOk(q.prompt.visual, q)) err('bad visual');
        if (!q.prompt.text || !q.prompt.speech || /[^\s]\.\s+\S.*[.?!]$/.test(q.prompt.speech)) err(`prompt should be one sentence: "${q.prompt.speech}"`);
        if (q.hints.length < 1 || !q.hints[0].text) err('no hint');
        if (q.explanation.length < 1) err('no explanation');
        // Animated explanation: valid actions, and the last one lands on the answer.
        const why = explanationProblem(q.explanation, q.answer);
        if (why) err(why);
        // Hints: the default has an animation; every wrong choice gets an animated hint.
        if (q.hints[0].for) err('the first hint should be the default (no `for`)');
        for (const h of q.hints) if (!h.action || !actionValid(h.action)) err(`hint without a valid action: ${JSON.stringify(h)}`);
        for (const d of q.distractors) if (!pickHint(q, d).action) err(`no animated hint for ${d}`);
        const again = makeQuestion(skill.id, lv.level, seed);
        if (JSON.stringify(again) !== JSON.stringify(q)) err('same seed gave a different question');
        answers.add(String(q.answer));
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
    ['count.to10', 3, ['count-off-by-one']]
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
      ['compare.to10', 'reversed-sign', 'compare']
    ];
    for (const [id, tag, kind] of want) {
      let seen = false;
      for (let seed = 0; seed < 400 && !seen; seed++) {
        const q = makeQuestion(id, 3, seed);
        const wrong = Object.keys(q.errorTags).find((d) => q.errorTags[d] === tag);
        if (wrong === undefined) continue;
        seen = true;
        const h = pickHint(q, typeof q.answer === 'number' ? Number(wrong) : (wrong as Answer));
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
      for (let i = 1; i < r.length; i++) if (r[i].answer === r[i - 1].answer && possible > 2) fail(`${skill.id} L${lv.level}: same answer twice in a row`);
    }
  }
  ok('rounds: 8 questions, reproducible, no repeated exercise or answer twice in a row');
}

// ---------- Skills, recommendations, scoring ----------
{
  const ids = SKILLS.map((s) => s.id);
  if (ids.join() !== 'count.to10,compare.to10,add.within10,sub.within10,story.within10') fail('skills: ' + ids);
  for (const s of SKILLS) {
    for (const p of s.prerequisites) if (!getSkill(p)) fail(`${s.id}: unknown prerequisite ${p}`);
    if (s.levels.length < 2 || s.levels.length > 3) fail(`${s.id}: ${s.levels.length} levels (2–3 wanted)`);
    s.levels.forEach((l, i) => l.level !== i + 1 && fail(`${s.id}: levels not numbered 1..n`));
  }
  if (recommendedSkills('4-5').join() !== 'count.to10,compare.to10') fail('recommended 4-5: ' + recommendedSkills('4-5'));
  if (recommendedSkills('6-7').join() !== 'add.within10,sub.within10,story.within10') fail('recommended 6-7: ' + recommendedSkills('6-7'));
  if (recommendedSkills('10-12').join() !== 'add.within10,sub.within10,story.within10') fail('recommended 10-12: ' + recommendedSkills('10-12'));
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
  if (nodes.length < 14 || nodes.length > 18) fail(`chapter 1 has ${nodes.length} stations (about 15)`);
  if (nodes[0].kind !== 'lesson' || nodes.at(-1)!.kind !== 'boss') fail('chapter 1 runs from a lesson to the boss');
  const chestAt = nodes.findIndex((n) => n.kind === 'chest');
  if (chestAt < 4 || chestAt > nodes.length - 4) fail('the chest should be in the middle');
  if (ch.sections.map((s) => s.title).join('|') !== 'מספרים עד 10|חיבור וחיסור עד 10') fail('sections: ' + ch.sections.map((s) => s.title));
  const boss = nodes.at(-1)!;
  if (boss.kind === 'boss' && !(boss.skillIds.includes('add.within10') && boss.skillIds.includes('sub.within10'))) fail('the boss mixes adding and taking away');
  // Every skill gets its lesson before its first practice; practice levels rise per skill.
  const seenLesson = new Set<string>();
  const lastLevel: Record<string, number> = {};
  for (const n of nodes) {
    if (n.kind === 'lesson') seenLesson.add(n.skillId);
    if (n.kind === 'practice') {
      if (!seenLesson.has(n.skillId)) fail(`${n.id}: practice before the lesson`);
      if ((lastLevel[n.skillId] ?? 0) >= n.level) fail(`${n.id}: levels should rise`);
      lastLevel[n.skillId] = n.level;
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
  if (chapterMaxStars(ch) !== nodes.reduce((s, n) => s + maxStars(n), 0)) fail('chapterMaxStars');

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
  ok(`quest: ${nodes.length} stations from a lesson to the boss, ids unique, skills exist, every station reachable, opening only forward, star gates, migration from skills`);
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
  for (const lv of getSkill('story.within10')!.levels) {
    for (let seed = 0; seed < 1000; seed++) {
      const q = makeQuestion('story.within10', lv.level, seed);
      const where = `story L${lv.level} seed ${seed}`;
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
      if (filled.answer !== q.answer || filled.prompt.math !== q.prompt.math || filled.key !== q.key) fail(`${where}: filling changed the math`);
      if (fillQuestion(q, DEFAULT_WORDS).prompt.text !== filled.prompt.text) fail(`${where}: filling is not reproducible`);
      if (q.prompt.math?.includes('+')) plus++;
      else minus++;
    }
  }
  for (const p of PLACEHOLDERS) if (!used.has(p)) fail(`no story uses {${p}}`);
  if (plus < 400 || minus < 400) fail(`stories: ${plus} adding, ${minus} taking away`);
  // Other questions come back unchanged.
  const plain = makeQuestion('add.within10', 2, 7);
  if (fillQuestion(plain, DEFAULT_WORDS) !== plain) fail('a question without placeholders should come back as it is');
  ok(`word problems: ${PLACEHOLDERS.length} placeholders, stories filled with no {…} left, the math unchanged, a noun only after 2 or more, neutral Hebrew`);
}

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nall core checks passed');
