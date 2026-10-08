// The placement game (docs/ARCHITECTURE.md §7.4): "let's see what you already know", optional,
// right after a new profile is made (or from settings, "check again"). Up to 10 questions that
// adapt (core/mastery/placement.ts: it starts by age, climbs after a right answer, steps down
// after a wrong one), in the chosen world, with the hero and the full feedback of a round
// (games/Ask.tsx: hints, explanations). It can be skipped at any moment – nothing changes then.
// At the end the skills the child knows are marked as mastered (storage/skillStates.ts
// applyPlacement), their stations on the map count as done – without bursts – and the hero
// stands at the first station not known yet (storage/questProgress.ts placeOnMap).
// Every answer also goes to the mastery engine. Loaded lazily, like the game.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { makeQuestion } from '../core/generators/index';
import { LADDER, PLACEMENT_MAX, placementResult, placementStep, rungKnown, startPlacement, type PlacementState } from '../core/mastery/index';
import { findNode } from '../core/quest/index';
import { getSkill } from '../core/skills/index';
import { fillQuestion } from '../core/story';
import { answerKey, type Question, type SkillId } from '../core/types';
import { emit, hushFeedback, setFxWorld } from '../fx/director';
import { Hero, setHeroMood, useHeroMood } from '../fx/Hero';
import { reducedMotion } from '../fx/motion';
import { Feedback, SpeakButton, useAutoSpeak, type Message } from '../components/Speak';
import { Ask, msg } from '../games/Ask';
import { approxAge, byGender, type Profile } from '../profiles/profiles';
import { applyPlacement, recordAnswer } from '../storage/skillStates';
import { placeOnMap } from '../storage/questProgress';
import { storyWords, useWorld } from '../worlds/index';
import { playSfx } from '../audio/sfx';

interface Props {
  profile: Profile;
  /** Back to the map (after the end, or skipped). */
  onDone: () => void;
}

type Phase = 'intro' | 'test' | 'done';

const levelsOf = (id: SkillId) => getSkill(id)?.levels.length ?? 1;

export function Placement({ profile, onDone }: Props) {
  const world = useWorld();
  const mood = useHeroMood();
  const words = storyWords(world, profile.gender);
  const seed = useMemo(() => Math.floor(Math.random() * 0x7fffffff), []);
  const [phase, setPhase] = useState<Phase>('intro');
  const [st, setSt] = useState<PlacementState>(() => startPlacement(approxAge(profile)));
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState<Message | null>(null);
  const [to, setTo] = useState<string>('');
  const seen = useRef(new Set<string>());
  const dots = useRef<HTMLOListElement>(null);
  const timers = useRef<number[]>([]);
  const later = (f: () => void, ms: number) => timers.current.push(window.setTimeout(f, ms));

  const rung = LADDER[st.at];
  const q: Question = useMemo(() => {
    let x = makeQuestion(rung.skillId, rung.level, seed + st.asked * 7919);
    for (let t = 1; seen.current.has(x.key) && t < 30; t++) x = makeQuestion(rung.skillId, rung.level, seed + st.asked * 7919 + t);
    seen.current.add(x.key);
    return fillQuestion(x, words);
  }, [st.asked]);

  const ask = byGender(profile, 'בוא נראה מה אתה כבר יודע!', 'בואי נראה מה את כבר יודעת!', 'בואו נראה מה אתם כבר יודעים!');
  const doneText = to ? `כל הכבוד! ממשיכים מ: ${to}` : 'כל הכבוד!';
  useAutoSpeak(phase === 'intro' ? ask : phase === 'done' ? doneText : q.prompt.speech, phase === 'test' ? `${st.asked}` : phase);

  useEffect(() => {
    setFxWorld(world.id);
    return () => {
      timers.current.forEach(clearTimeout);
      hushFeedback();
    };
  }, []);

  /** The result: skills and stations, then the end screen. */
  async function finish(s: PlacementState) {
    const r = placementResult(s, levelsOf);
    await applyPlacement(profile.id, r, levelsOf);
    const rec = await placeOnMap(profile.id, (id, level) => rungKnown(id, level, r.known));
    const at = rec.at ? findNode(rec.at) : undefined;
    setTo(at?.title ?? '');
    setPhase('done');
    setMessage(null);
    setHeroMood('happy');
    emit({ type: 'roundDone', stars: r.known >= 12 ? 3 : r.known >= 4 ? 2 : 1 });
  }

  /** One question over: the ladder moves (right the first time or not). */
  function step(firstTry: boolean) {
    const next = placementStep(st, firstTry);
    if (next.done) {
      later(() => void finish(next), reducedMotion() ? 400 : 900);
      return;
    }
    later(() => {
      setSt(next);
      setMessage(null);
    }, reducedMotion() ? 500 : 950);
  }

  const skip = (
    <button
      type="button"
      class="btn btn-ghost skip-btn"
      data-testid="placement-skip"
      onClick={() => {
        playSfx('tap');
        onDone();
      }}
    >
      {byGender(profile, 'דלג', 'דלגי', 'דלגו')} ⏭
    </button>
  );

  if (phase === 'intro')
    return (
      <main class="screen celebrate placement is-intro" data-testid="placement" data-phase="intro">
        <h1 class="celebrate-title">{ask}</h1>
        <Hero def={world.hero!} gender={profile.gender} state={mood.state} key={mood.n} class="celebrate-hero" />
        <p class="celebrate-sub">
          {`עד ${PLACEMENT_MAX} שאלות קצרות`} <SpeakButton text={ask} class="speak-inline" />
        </p>
        <div class="row celebrate-actions">
          <button
            type="button"
            class="btn btn-primary btn-big"
            data-testid="placement-start"
            onClick={() => {
              playSfx('start');
              setPhase('test');
            }}
          >
            ▶ מתחילים
          </button>
          {skip}
        </div>
      </main>
    );

  if (phase === 'done')
    return (
      <main class="screen celebrate placement is-done" data-testid="placement" data-phase="done" data-to={to}>
        <h1 class="celebrate-title">{doneText}</h1>
        <Hero def={world.hero!} gender={profile.gender} state={mood.state} key={mood.n} class="celebrate-hero" />
        <p class="celebrate-sub">
          <SpeakButton text={doneText} class="speak-inline" />
        </p>
        <button type="button" class="btn btn-primary btn-big" data-testid="placement-map" onClick={onDone}>
          🗺️ למפה
        </button>
      </main>
    );

  return (
    <main class="screen game placement" data-testid="placement" data-phase="test" data-skill={rung.skillId} data-level={rung.level} data-rung={st.at} data-answer={answerKey(q.answer)}>
      <header class="topbar game-top">
        <span />
        <h1 class="topbar-title">
          <span aria-hidden="true">🔍</span> {byGender(profile, 'מה אני כבר יודע?', 'מה אני כבר יודעת?', 'מה אנחנו כבר יודעים?')}
        </h1>
        {skip}
      </header>

      <ol class="round-dots" ref={dots} aria-label={`שאלה ${st.asked + 1}`}>
        {Array.from({ length: PLACEMENT_MAX }, (_, i) => (
          <li key={i} class={`round-dot ${i === st.asked ? 'is-now' : ''} ${i < st.asked ? 'is-first' : ''}`} />
        ))}
      </ol>

      <Ask
        key={q.id}
        question={q}
        mode="bubbles"
        profile={profile}
        onMessage={setMessage}
        onRight={(wrongBefore, from) => {
          const s = wrongBefore === 0 ? streak + 1 : 1;
          setStreak(s);
          setMessage(msg(wrongBefore === 0 ? ['נכון!', 'מעולה!', 'יפה מאוד!'][st.asked % 3] : 'יפה מאוד!', 'good'));
          emit({ type: 'correct', streak: s }, { el: from, to: dots.current?.children[st.asked] });
          step(wrongBefore === 0);
        }}
        onWrong={() => setStreak(0)}
        onResult={(r) => void recordAnswer(profile.id, q.skillId, r, rung.level)}
        onNext={() => step(false)}
        nextLabel="הבא ←"
      />

      <div class="game-hero-row">
        <Hero def={world.hero!} gender={profile.gender} state={mood.state} key={mood.n} class="game-hero" />
        <div class="speech-bubble">
          <Feedback message={message} idle={byGender(profile, 'בחר תשובה', 'בחרי תשובה', 'בחרו תשובה')} />
        </div>
      </div>
    </main>
  );
}
