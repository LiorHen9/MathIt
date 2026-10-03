// A practice round: 8 questions of one skill in a game template (Pop for now), the hero beside
// them reacting to everything, a combo counter, two tries per question with a hint after the
// first mistake and the answer after the second, and stars at the end that appear one by one
// (a celebration a tap skips). Loaded lazily, with the generators and the feedback engine.
//
// Every bit of feedback goes through the Feedback Director (fx/director.ts): this screen says
// *what happened* (correct, wrong, hint, starEarned, roundDone); the director decides how it
// looks and sounds.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { makeRound } from '../core/generators/index';
import { MAX_WRONG, ROUND_LENGTH, nextLevel, questionPoints, starsFor } from '../core/round';
import { getSkill, startLevel } from '../core/skills/index';
import { isCorrect, type Answer, type Question, type SkillId } from '../core/types';
import { emit, hushFeedback, setFxWorld } from '../fx/director';
import { Hero, setHeroMood, useHeroMood } from '../fx/Hero';
import { countUp, reducedMotion } from '../fx/motion';
import { Feedback, SpeakButton, useAutoSpeak, type Message } from '../components/Speak';
import { Pop, type InputMode } from '../games/Pop';
import { ageBand, approxAge, byGender, type Profile } from '../profiles/profiles';
import { getSkillState, saveRound } from '../storage/skillStates';
import { useWorld } from '../worlds/index';
import { playSfx } from '../audio/sfx';

interface Props {
  profile: Profile;
  skillId: SkillId;
  onHome: () => void;
}

type Result = 'first' | 'second' | 'shown';

/** Typed answers for some questions: every third one, for skills with number answers. */
function inputFor(q: Question, i: number): InputMode {
  return q.numeric && i % 3 === 2 ? 'numpad' : 'bubbles';
}

let msgId = 0;
const msg = (text: string, tone: Message['tone'], speech?: string): Message => ({ text, tone, id: ++msgId, speech });

export function GameHost({ profile, skillId, onHome }: Props) {
  const skill = getSkill(skillId)!;
  const world = useWorld();
  const [level, setLevel] = useState<number | null>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff));
  const [game, setGame] = useState(0);

  useEffect(() => {
    setFxWorld(world.id);
  }, [world.id]);

  // The level: where this skill was left, or a start by age.
  useEffect(() => {
    let alive = true;
    void getSkillState(profile.id, skillId).then((s) => alive && setLevel(s?.level ?? startLevel(skill, ageBand(profile))));
    return () => {
      alive = false;
    };
  }, []);

  // Leaving the screen stops any celebration still going.
  useEffect(() => () => hushFeedback(), []);

  if (level === null) return <main class="screen loading" aria-busy="true" />;
  return (
    <Round
      key={game}
      profile={profile}
      skillId={skillId}
      level={level}
      seed={seed}
      onHome={onHome}
      onAgain={(next) => {
        setLevel(next);
        setSeed(Math.floor(Math.random() * 0x7fffffff));
        setGame((g) => g + 1);
      }}
    />
  );
}

interface RoundProps {
  profile: Profile;
  skillId: SkillId;
  level: number;
  seed: number;
  onHome: () => void;
  onAgain: (level: number) => void;
}

function Round({ profile, skillId, level, seed, onHome, onAgain }: RoundProps) {
  const skill = getSkill(skillId)!;
  const world = useWorld();
  const questions = useMemo(() => makeRound(skillId, level, seed, ROUND_LENGTH), [skillId, level, seed]);
  const [idx, setIdx] = useState(0);
  const [tried, setTried] = useState<Answer[]>([]);
  const [status, setStatus] = useState<'asking' | 'solved' | 'shown'>('asking');
  const [hint, setHint] = useState(false);
  const [streak, setStreak] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState<Message | null>(null);
  const [end, setEnd] = useState<{ stars: 0 | 1 | 2 | 3; next: number } | null>(null);
  const dots = useRef<HTMLOListElement>(null);
  const comboNum = useRef<HTMLSpanElement>(null);
  const prevStreak = useRef(0);
  const timers = useRef<number[]>([]);
  const mood = useHeroMood();
  const young = approxAge(profile) <= 7;

  const q = questions[idx];
  const later = (f: () => void, ms: number) => timers.current.push(window.setTimeout(f, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useAutoSpeak(end ? null : q.prompt.speech, q.id);

  // The combo counter climbs to the new streak.
  useEffect(() => {
    if (streak >= 2) countUp(comboNum.current, Math.max(prevStreak.current, 1), streak, 300);
    prevStreak.current = streak;
  }, [streak]);

  function praise(s: number): string {
    if (s >= 3) return `${byGender(profile, 'אלוף', 'אלופה', 'אלופים')}! ${s} ברצף!`;
    return ['כל הכבוד!', 'מעולה!', 'יפה מאוד!', 'נכון!'][idx % 4];
  }

  function answer(a: Answer, from: Element) {
    if (status !== 'asking' || end) return;
    const to = dots.current?.children[idx] ?? null;
    if (isCorrect(q, a)) {
      const s = streak + 1;
      setStreak(s);
      setStatus('solved');
      const rs: Result[] = [...results, tried.length === 0 ? 'first' : 'second'];
      setResults(rs);
      setMessage(msg(praise(s), 'good', s >= 3 ? `${praise(s).split('!')[0]}!` : undefined));
      emit({ type: 'correct', streak: s }, { el: from, to });
      // A timer keeps this render's values: hand it the new results.
      later(() => next(rs), reducedMotion() ? 500 : 950);
      return;
    }
    const attempt = tried.length + 1;
    setTried((t) => [...t, a]);
    setStreak(0);
    emit({ type: 'wrong', attempt }, { el: from });
    if (attempt < MAX_WRONG) {
      const again = byGender(profile, 'נסה שוב!', 'נסי שוב!', 'נסו שוב!');
      setMessage(msg(again, 'bad'));
      // The hint a moment later, so the two sounds do not collide.
      later(() => {
        setHint(true);
        emit({ type: 'hint' });
      }, 450);
    } else {
      setStatus('shown');
      setResults([...results, 'shown']);
      const shown = typeof q.answer === 'number' ? `התשובה היא ${q.answer}.` : `הסימן הנכון הוא ${q.answer}`;
      setMessage(msg(shown, 'info', q.explanation.at(-1)?.text));
    }
  }

  function next(rs: Result[]) {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setTried([]);
      setStatus('asking');
      setHint(false);
      setMessage(null);
      return;
    }
    finish(rs);
  }

  function finish(rs: Result[]) {
    const points = rs.reduce((sum, x) => sum + (x === 'first' ? questionPoints(0, true) : x === 'second' ? questionPoints(1, true) : 0), 0);
    const stars = starsFor(points, questions.length);
    const nl = nextLevel(level, stars, skill.levels.length);
    setEnd({ stars, next: nl });
    setMessage(null);
    void saveRound(profile.id, skillId, stars, nl);
  }

  if (end) return <Celebration profile={profile} stars={end.stars} levelUp={end.next > level} young={young} onAgain={() => onAgain(end.next)} onHome={onHome} />;

  const mode = inputFor(q, idx);
  return (
    <main class="screen game" data-skill={skillId} data-level={level}>
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
        <h1 class="topbar-title">
          <span aria-hidden="true">{skill.icon}</span> {skill.title} <span class="level-chip">שלב {level}</span>
        </h1>
        <span class={`combo ${streak >= 2 ? 'is-on' : ''}`} data-testid="combo" aria-live="polite" dir="ltr">
          {streak >= 2 && (
            <>
              🔥 ×<span ref={comboNum}>{streak}</span>
            </>
          )}
        </span>
      </header>

      <ol class="round-dots" ref={dots} aria-label={`שאלה ${idx + 1} מתוך ${questions.length}`}>
        {questions.map((x, i) => (
          <li key={x.id} class={`round-dot ${i === idx ? 'is-now' : ''} ${results[i] ? `is-${results[i]}` : ''}`} />
        ))}
      </ol>

      <Pop
        key={q.id}
        question={q}
        mode={mode}
        done={status === 'solved'}
        tried={tried}
        reveal={status === 'shown'}
        hint={hint || status === 'shown' ? q.hints[0] : null}
        onAnswer={answer}
      />

      <div class="game-hero-row">
        <Hero def={world.hero!} gender={profile.gender} state={mood.state} key={mood.n} class="game-hero" />
        <div class="speech-bubble">
          <Feedback message={message} idle={mode === 'numpad' ? byGender(profile, 'הקלד ולחץ בדוק', 'הקלידי ולחצי בדוק', 'הקלידו ולחצו בדוק') : byGender(profile, 'בחר תשובה', 'בחרי תשובה', 'בחרו תשובה')} />
          {status === 'shown' && (
            <button type="button" class="btn btn-primary" data-testid="next" onClick={() => next(results)}>
              {idx + 1 < questions.length ? 'הבא ←' : 'לסיום ←'}
            </button>
          )}
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
  onAgain: () => void;
  onHome: () => void;
}

const TITLES = ['מתאמנים ומשתפרים!', 'יפה מאוד!', 'כל הכבוד!', 'מושלם!'];

/** The end of a round: the stars appear one by one, each a note higher, then the fanfare. */
function Celebration({ profile, stars, levelUp, young, onAgain, onHome }: CelebrationProps) {
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
        <div class="row celebrate-actions">
          <button type="button" class="btn btn-primary btn-big" data-testid="again" onClick={onAgain}>
            🔁 שוב
          </button>
          <button type="button" class="btn btn-secondary btn-big" data-testid="home" onClick={onHome}>
            🏠 לבית
          </button>
        </div>
      ) : (
        // The whole screen skips on a tap; this button is the visible (and keyboard) way.
        <button type="button" class="btn btn-ghost skip-btn" data-testid="skip">
          {byGender(profile, 'גע', 'געי', 'געו')} כדי לדלג ⏭
        </button>
      )}
    </main>
  );
}
