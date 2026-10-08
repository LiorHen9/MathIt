// A practice round: 8 questions of one skill in a game template (Pop for now), the hero beside
// them reacting to everything, a combo counter, two tries per question (games/Ask.tsx: an
// animated hint after the first mistake, an animated step-by-step explanation after the second),
// and stars at the end that appear one by one (a celebration a tap skips). Loaded lazily, with
// the generators, the feedback engine and the teaching animations.
//
// From the quest map (phase 4) a round is a station: it plays the station's level, its stars are
// saved for the station too (storage/questProgress.ts), and the end leads back to the map.
//
// The mastery engine (phase 6, core/mastery): every answer is saved at once (recordAnswer). The
// questions are made one at a time: in free practice the level follows the child inside the
// round (3 right the first time in a row → one level up; 2 wrong in a row → one down, and the
// hint comes early); a station keeps its level but also gives early hints. Questions lean toward
// the child's common mistake (pickQuestion), the hint fits it, and a question whose answer had
// to be shown comes back later in the round – itself or a "sister" with the same kind of
// mistake – once, the round growing to 10 at most. A review station (`review`) is the same round
// over several skills, each at its own level, 6 questions.
//
// Every bit of feedback goes through the Feedback Director (fx/director.ts): this screen says
// *what happened* (correct, wrong, hint, levelUp, starEarned, roundDone, coin); the director and
// the world decide how it looks and sounds. Every right answer earns one of the world's coins
// (components/Coins.tsx). Word problems are filled with the world's words (core/story.ts).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { pickQuestion, sisterOf } from '../core/mastery/pick';
import { adaptLevel, commonError, startLevelState, type AnswerResult, type LevelState } from '../core/mastery/index';
import { createRng } from '../core/rng';
import { fillQuestion } from '../core/story';
import { ROUND_LENGTH, nextLevel, questionPoints, starsFor } from '../core/round';
import { getSkill, startLevel } from '../core/skills/index';
import type { ErrorTag, Question, SkillId } from '../core/types';
import { emit, hushFeedback, setFxWorld } from '../fx/director';
import { Hero, setHeroMood, useHeroMood } from '../fx/Hero';
import { countUp, reducedMotion } from '../fx/motion';
import { Feedback, SpeakButton, useAutoSpeak, type Message } from '../components/Speak';
import type { InputMode } from '../games/Pop';
import { Ask, msg } from '../games/Ask';
import { ageBand, approxAge, byGender, type Profile } from '../profiles/profiles';
import { listSkillStates, recordAnswer, saveRound, type SkillState } from '../storage/skillStates';
import { recordNodeStars, recordReview } from '../storage/questProgress';
import { storyWords, useWorld } from '../worlds/index';
import { CoinChip, useCoins } from '../components/Coins';
import { playSfx } from '../audio/sfx';

interface Props {
  profile: Profile;
  /** The skill of a practice round (free practice or a station). */
  skillId?: SkillId;
  onHome: () => void;
  /** A station on the quest map: play this level and save the stars for the station. */
  quest?: { nodeId: string; level: number };
  /** A review station: these skills mixed, each at its own level. */
  review?: { skillIds: SkillId[]; count: number };
}

type Result = 'first' | 'second' | 'shown';

/** A shown question can bring the round up to this many more. */
export const MAX_EXTRA = 2;
/** A struggling child sees the hint this long after a question appears. */
export const EARLY_HINT_MS = 4000;

/** Typed answers for some questions: every third one, for skills with number answers. */
function inputFor(q: Question, i: number): InputMode {
  return q.numeric && i % 3 === 2 ? 'numpad' : 'bubbles';
}

/** What the round needs to know about each skill in it. */
interface SkillSetup {
  level: number;
  common?: ErrorTag;
}

export function GameHost({ profile, skillId, onHome, quest, review }: Props) {
  const world = useWorld();
  const skills = review ? review.skillIds : [skillId!];
  const [setup, setSetup] = useState<Record<string, SkillSetup> | null>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff));
  const [game, setGame] = useState(0);

  useEffect(() => {
    setFxWorld(world.id);
  }, [world.id]);

  // Each skill's level (where it was left, or a start by age) and the child's common mistake.
  useEffect(() => {
    let alive = true;
    void listSkillStates(profile.id).then((all) => {
      if (!alive) return;
      const out: Record<string, SkillSetup> = {};
      for (const id of skills) {
        const s: SkillState | undefined = all[id];
        out[id] = { level: s?.level ?? startLevel(getSkill(id)!, ageBand(profile)), common: commonError(s?.errorCounts) };
      }
      setSetup(out);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Leaving the screen stops any celebration still going.
  useEffect(() => () => hushFeedback(), []);

  if (!setup) return <main class="screen loading" aria-busy="true" />;
  return (
    <Round
      key={game}
      profile={profile}
      skills={skills}
      setup={setup}
      quest={quest}
      review={review}
      seed={seed}
      onHome={onHome}
      onAgain={(own) => {
        if (skillId) setSetup({ ...setup, [skillId]: { ...setup[skillId], level: own } });
        setSeed(Math.floor(Math.random() * 0x7fffffff));
        setGame((g) => g + 1);
      }}
    />
  );
}

interface RoundProps {
  profile: Profile;
  skills: SkillId[];
  setup: Record<string, SkillSetup>;
  quest?: Props['quest'];
  review?: Props['review'];
  seed: number;
  onHome: () => void;
  /** Play again, from the skill's level now. */
  onAgain: (skillLevel: number) => void;
}

interface Planned {
  q: Question;
  /** It came back after its answer was shown (or is its sister). */
  repeat?: boolean;
}

/** The round's plan, changed in place between renders (timers read the newest). */
interface Plan {
  items: Planned[];
  total: number;
  lv: LevelState;
  repeats: { q: Question; at: number }[];
  seen: Set<string>;
  results: Result[];
}

function Round({ profile, skills, setup, quest, review, seed, onHome, onAgain }: RoundProps) {
  const single = skills.length === 1 && !review ? skills[0] : null;
  const skill = getSkill(skills[0])!;
  const world = useWorld();
  const words = useMemo(() => storyWords(world, profile.gender), [world.id]);
  const rng = useMemo(() => createRng(seed), [seed]);
  const base = review ? review.count : ROUND_LENGTH;
  /** The level the round started at (one skill). */
  const startLv = setup[skills[0]].level;
  const fixed = !!quest || !!review;
  const plan = useRef<Plan | null>(null);
  if (!plan.current) {
    const p: Plan = { items: [], total: base, lv: startLevelState(quest ? quest.level : startLv), repeats: [], seen: new Set(), results: [] };
    plan.current = p;
    p.items.push(make(p, 0));
  }
  const purse = useCoins(profile.id, world);
  const [idx, setIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [, setVer] = useState(0);
  const [message, setMessage] = useState<Message | null>(null);
  const [end, setEnd] = useState<{ stars: 0 | 1 | 2 | 3; own: number; up: boolean } | null>(null);
  const dots = useRef<HTMLOListElement>(null);
  const chip = useRef<HTMLSpanElement>(null);
  const comboNum = useRef<HTMLSpanElement>(null);
  const prevStreak = useRef(0);
  const timers = useRef<number[]>([]);
  const mood = useHeroMood();
  const young = approxAge(profile) <= 7;

  const P = plan.current;
  const item = P.items[idx];
  const q = item.q;
  const later = (f: () => void, ms: number) => timers.current.push(window.setTimeout(f, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /** The question at position `i`: a comeback that is due (or must fit before the end), else a new one. */
  function make(p: Plan, i: number): Planned {
    const left = p.total - i;
    const due = p.repeats.findIndex((r) => r.at <= i || left <= p.repeats.length);
    if (due >= 0) return { q: p.repeats.splice(due, 1)[0].q, repeat: true };
    const id = review ? skills[i % skills.length] : skills[0];
    const level = review ? setup[id].level : p.lv.level;
    const x = fillQuestion(pickQuestion(id, level, rng, p.seen, { last: p.items.at(-1)?.q, common: setup[id].common }), words);
    p.seen.add(x.key);
    return { q: x };
  }

  useAutoSpeak(end ? null : q.prompt.speech, `${idx}:${q.id}`);

  // The combo counter climbs to the new streak.
  useEffect(() => {
    if (streak >= 2) countUp(comboNum.current, Math.max(prevStreak.current, 1), streak, 300);
    prevStreak.current = streak;
  }, [streak]);

  function praise(s: number): string {
    if (s >= 3) return `${byGender(profile, 'אלוף', 'אלופה', 'אלופים')}! ${s} ברצף!`;
    return ['כל הכבוד!', 'מעולה!', 'יפה מאוד!', 'נכון!'][idx % 4];
  }

  function right(wrongBefore: number, from: Element) {
    if (end) return;
    const to = dots.current?.children[idx] ?? null;
    const s = streak + 1;
    setStreak(s);
    P.results[idx] = wrongBefore === 0 ? 'first' : 'second';
    setMessage(msg(praise(s), 'good', s >= 3 ? `${praise(s).split('!')[0]}!` : undefined));
    emit({ type: 'correct', streak: s }, { el: from, to });
    purse.earn(1, from);
    later(next, reducedMotion() ? 500 : 950);
  }

  /** The question is over: save it, move the level, plan a comeback for a shown answer. */
  function result(r: AnswerResult) {
    const skillOf = getSkill(q.skillId)!;
    void recordAnswer(profile.id, q.skillId, r, startLevel(skillOf, ageBand(profile)));
    const firstTry = r.correct && r.wrongBefore === 0;
    const lv = adaptLevel(P.lv, firstTry, skillOf.levels.length, fixed);
    P.lv = lv;
    if (lv.moved === 1) {
      later(() => {
        setMessage(msg('עולים שלב! ⬆️', 'good'));
        emit({ type: 'levelUp', level: lv.level }, { el: chip.current });
      }, reducedMotion() ? 200 : 500);
    }
    if (!r.correct && !item.repeat && P.total < base + MAX_EXTRA) {
      const tag = r.errorTags?.at(-1);
      const back = fillQuestion(sisterOf(q, tag, seed + idx * 7919 + 1, P.seen), words);
      P.seen.add(back.key);
      P.repeats.push({ q: back, at: idx + 2 });
      P.total += 1;
    }
    setVer((v) => v + 1);
  }

  function shown() {
    P.results[idx] = 'shown';
    setVer((v) => v + 1);
  }

  function next() {
    if (idx + 1 < P.total) {
      if (!P.items[idx + 1]) P.items.push(make(P, idx + 1));
      setIdx(idx + 1);
      setMessage(null);
      return;
    }
    finish();
  }

  function finish() {
    const rs = P.results;
    const points = rs.reduce((sum, x) => sum + (x === 'first' ? questionPoints(0, true) : x === 'second' ? questionPoints(1, true) : 0), 0);
    const stars = starsFor(points, P.total);
    setMessage(null);
    if (review) {
      setEnd({ stars, own: 0, up: false });
      void recordReview(profile.id);
      return;
    }
    // Free practice: the level the round reached. A station's round moves the skill's own level
    // only forward (it was played at the station's level).
    const own = quest ? Math.max(startLv, nextLevel(quest.level, stars, skill.levels.length)) : P.lv.level;
    setEnd({ stars, own, up: !quest && own > startLv });
    void saveRound(profile.id, skill.id, stars, own);
    if (quest) void recordNodeStars(profile.id, quest.nodeId, stars);
  }

  if (end)
    return (
      <Celebration
        profile={profile}
        stars={end.stars}
        levelUp={end.up}
        young={young}
        toMap={!!quest || !!review}
        again={!review}
        onAgain={() => onAgain(end.own)}
        onHome={onHome}
      />
    );

  const mode = inputFor(q, idx);
  const title = review ? (
    <>
      <span aria-hidden="true">🔁</span> חזרה
    </>
  ) : (
    <>
      <span aria-hidden="true">{skill.icon}</span> {skill.title}{' '}
      <span class="level-chip" ref={chip} data-testid="level-chip">
        שלב {q.level}
      </span>
    </>
  );
  return (
    <main
      class={`screen game ${review ? 'is-review' : ''}`}
      data-skill={single ?? 'review'}
      data-level={q.level}
      data-key={q.key}
      data-repeat={item.repeat ? 'yes' : 'no'}
      data-early={P.lv.earlyHint ? 'yes' : 'no'}
      data-total={P.total}
    >
      <header class="topbar game-top">
        <button
          type="button"
          class="icon-btn"
          aria-label="חזרה לבית"
          data-testid="game-home"
          onClick={() => {
            playSfx('tap');
            onHome();
          }}
        >
          ✕
        </button>
        <h1 class="topbar-title">{title}</h1>
        <span class="game-top-end">
          <span class={`combo ${streak >= 2 ? 'is-on' : ''}`} data-testid="combo" aria-live="polite" dir="ltr">
            {streak >= 2 && (
              <>
                🔥 ×<span ref={comboNum}>{streak}</span>
              </>
            )}
          </span>
          <CoinChip world={world} coins={purse.coins} chipRef={purse.chip} />
        </span>
      </header>

      <ol class="round-dots" ref={dots} aria-label={`שאלה ${idx + 1} מתוך ${P.total}`}>
        {Array.from({ length: P.total }, (_, i) => (
          <li key={i} class={`round-dot ${i === idx ? 'is-now' : ''} ${P.results[i] ? `is-${P.results[i]}` : ''} ${P.items[i]?.repeat ? 'is-repeat' : ''}`} />
        ))}
      </ol>

      <Ask
        key={`${idx}:${q.id}`}
        question={q}
        mode={mode}
        profile={profile}
        onMessage={setMessage}
        onRight={right}
        onWrong={() => setStreak(0)}
        onShown={shown}
        onNext={next}
        onResult={result}
        common={setup[q.skillId]?.common}
        hintAfterMs={P.lv.earlyHint ? EARLY_HINT_MS : undefined}
        nextLabel={idx + 1 < P.total ? 'הבא ←' : 'לסיום ←'}
      />

      <div class="game-hero-row">
        <Hero def={world.hero!} gender={profile.gender} state={mood.state} key={mood.n} class="game-hero" />
        <div class="speech-bubble">
          <Feedback message={message} idle={mode === 'numpad' ? byGender(profile, 'הקלד ולחץ בדוק', 'הקלידי ולחצי בדוק', 'הקלידו ולחצו בדוק') : byGender(profile, 'בחר תשובה', 'בחרי תשובה', 'בחרו תשובה')} />
        </div>
      </div>
    </main>
  );
}

interface CelebrationProps {
  profile: Profile;
  stars: 0 | 1 | 2 | 3;
  levelUp: boolean;
  young: boolean;
  /** A quest station: the way on is back to the map. */
  toMap: boolean;
  /** Offer to play again (not after a review). */
  again: boolean;
  onAgain: () => void;
  onHome: () => void;
}

const TITLES = ['מתאמנים ומשתפרים!', 'יפה מאוד!', 'כל הכבוד!', 'מושלם!'];

/** The end of a round: the stars appear one by one, each a note higher, then the fanfare. */
function Celebration({ profile, stars, levelUp, young, toMap, again, onAgain, onHome }: CelebrationProps) {
  const world = useWorld();
  const mood = useHeroMood();
  const [shown, setShown] = useState(0);
  const [over, setOver] = useState(false);
  const slots = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const title = TITLES[stars];
  const got = stars === 0 ? 'עוד סבב ויהיו כוכבים' : stars === 1 ? 'קיבלת כוכב אחד' : `קיבלת ${stars} כוכבים`;
  // One sentence for the youngest.
  const speech = young ? `${title.replace('!', ',')} ${got}!` : `${title} ${got}.${levelUp ? ' עולים שלב!' : ''}`;
  useAutoSpeak(speech, 'end');

  useEffect(() => {
    const fast = reducedMotion();
    const gap = fast ? 250 : 650;
    let t = fast ? 200 : 600;
    setHeroMood('happy');
    for (let n = 1; n <= stars; n++) {
      const at = t;
      timers.current.push(
        window.setTimeout(() => {
          setShown(n);
          emit({ type: 'starEarned', n }, { el: slots.current?.children[n - 1] });
        }, at)
      );
      t += gap;
    }
    timers.current.push(window.setTimeout(() => emit({ type: 'roundDone', stars }), t));
    timers.current.push(window.setTimeout(() => setOver(true), t + (fast ? 300 : 1700)));
    return () => timers.current.forEach(clearTimeout);
  }, []);

  function skip() {
    if (over) return;
    timers.current.forEach(clearTimeout);
    hushFeedback();
    setShown(stars);
    setOver(true);
    emit({ type: 'roundDone', stars, skipped: true });
  }

  return (
    <main class={`screen celebrate ${over ? 'is-over' : ''}`} data-stars={stars} onClick={skip}>
      <h1 class="celebrate-title">{title}</h1>
      <div class="celebrate-stars" ref={slots} role="img" aria-label={`${stars} מתוך 3 כוכבים`}>
        {[1, 2, 3].map((n) => (
          <span key={n} class={`big-star ${n <= shown ? 'is-on' : ''}`} data-testid={`star-${n}`}>
            ★
          </span>
        ))}
      </div>
      <Hero def={world.hero!} gender={profile.gender} state={mood.state} key={mood.n} class="celebrate-hero" />
      <p class="celebrate-sub">
        {got}
        {levelUp && <strong class="level-up"> · עולים שלב! ⬆️</strong>} <SpeakButton text={speech} class="speak-inline" />
      </p>
      {over ? (
        toMap ? (
          <div class="row celebrate-actions">
            <button type="button" class="btn btn-primary btn-big" data-testid="to-map" onClick={onHome}>
              {stars > 0 ? '🗺️ ממשיכים במסע' : '🗺️ למפה'}
            </button>
            {again && (
              <button type="button" class="btn btn-secondary btn-big" data-testid="again" onClick={onAgain}>
                🔁 שוב
              </button>
            )}
          </div>
        ) : (
          <div class="row celebrate-actions">
            <button type="button" class="btn btn-primary btn-big" data-testid="again" onClick={onAgain}>
              🔁 שוב
            </button>
            <button type="button" class="btn btn-secondary btn-big" data-testid="home" onClick={onHome}>
              🏠 לבית
            </button>
          </div>
        )
      ) : (
        // The whole screen skips on a tap; this button is the visible (and keyboard) way.
        <button type="button" class="btn btn-ghost skip-btn" data-testid="skip">
          {byGender(profile, 'גע', 'געי', 'געו')} כדי לדלג ⏭
        </button>
      )}
    </main>
  );
}
