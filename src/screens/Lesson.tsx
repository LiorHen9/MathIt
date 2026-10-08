// A lesson station (docs/ARCHITECTURE.md §6.1): 3–5 short screens from core/lessons/ – "watch"
// screens where the hero explains with an animation (manipulatives/Explainer.tsx, read aloud in
// time with it) and "your turn" screens with one question and the full feedback of a round
// (games/Ask.tsx: animated hint, then a step-by-step explanation). At the end a star, the
// lesson is saved as seen (skillStates.lessonSeen), and the child can go straight to practice.
// As a quest station (phase 4) it also gives the station its star, and the end leads back to the
// map, where the hero walks on. Loaded lazily, like the game.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { findQuestion } from '../core/generators/index';
import { fillQuestion } from '../core/story';
import { getLesson } from '../core/lessons/index';
import { getSkill, startLevel } from '../core/skills/index';
import type { SkillId } from '../core/types';
import { emit, hushFeedback, setFxWorld } from '../fx/director';
import { Hero, setHeroMood, useHeroMood } from '../fx/Hero';
import { reducedMotion } from '../fx/motion';
import { Feedback, SpeakButton, useAutoSpeak, type Message } from '../components/Speak';
import { Ask, msg } from '../games/Ask';
import { Explainer } from '../manipulatives/Explainer';
import { ageBand, byGender, type Profile } from '../profiles/profiles';
import { saveLessonSeen } from '../storage/skillStates';
import { recordNodeStars } from '../storage/questProgress';
import { storyWords, useWorld } from '../worlds/index';
import { playSfx } from '../audio/sfx';
import { stopSpeaking } from '../audio/speech';

interface Props {
  profile: Profile;
  skillId: SkillId;
  onHome: () => void;
  onPractice: () => void;
  /** The quest station this lesson is (its star is saved; the end goes back to the map). */
  nodeId?: string;
}

export function Lesson({ profile, skillId, onHome, onPractice, nodeId }: Props) {
  const lesson = getLesson(skillId)!;
  const skill = getSkill(skillId)!;
  const world = useWorld();
  const mood = useHeroMood();
  const [at, setAt] = useState(0);
  const [finished, setFinished] = useState(false);
  const [watched, setWatched] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [replay, setReplay] = useState(0);
  const [message, setMessage] = useState<Message | null>(null);
  const dots = useRef<HTMLOListElement>(null);
  const timers = useRef<number[]>([]);
  const part = lesson.parts[at];
  const words = storyWords(world, profile.gender);
  const question = useMemo(() => {
    const q = part.kind === 'try' ? findQuestion(skillId, part.level, part.key) : null;
    return q && fillQuestion(q, words);
  }, [skillId, at]);

  useEffect(() => {
    setFxWorld(world.id);
  }, [world.id]);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      hushFeedback();
    },
    []
  );

  useAutoSpeak(!finished && question ? question.prompt.speech : null, `${at}`);

  function next() {
    timers.current.forEach(clearTimeout);
    stopSpeaking();
    setMessage(null);
    setWatched(false);
    setSkipped(false);
    if (at + 1 < lesson.parts.length) {
      setAt(at + 1);
      return;
    }
    setFinished(true);
    void saveLessonSeen(profile.id, skillId, startLevel(skill, ageBand(profile)));
    if (nodeId) void recordNodeStars(profile.id, nodeId, 1);
  }

  if (finished) return <LessonDone profile={profile} title={lesson.title} toMap={!!nodeId} onPractice={onPractice} onHome={onHome} />;

  const watchIdle = byGender(profile, 'צפה והקשב', 'צפי והקשיבי', 'צפו והקשיבו');
  const pickIdle = byGender(profile, 'בחר תשובה', 'בחרי תשובה', 'בחרו תשובה');
  return (
    <main class="screen game lesson" data-skill={skillId} data-part={at + 1} data-kind={part.kind}>
      <header class="topbar game-top">
        <button
          type="button"
          class="icon-btn"
          aria-label="חזרה לבית"
          data-testid="lesson-home"
          onClick={() => {
            playSfx('tap');
            onHome();
          }}
        >
          ✕
        </button>
        <h1 class="topbar-title">
          <span aria-hidden="true">📖</span> {lesson.title}
        </h1>
        <span class="lesson-count" dir="ltr" aria-label={`מסך ${at + 1} מתוך ${lesson.parts.length}`}>
          {at + 1}/{lesson.parts.length}
        </span>
      </header>

      <ol class="round-dots" ref={dots} aria-hidden="true">
        {lesson.parts.map((p, i) => (
          <li key={i} class={`round-dot ${i === at ? 'is-now' : ''} ${i < at ? 'is-first' : ''} ${p.kind === 'try' ? 'is-try' : ''}`} />
        ))}
      </ol>

      {part.kind === 'watch' ? (
        <>
          <Explainer key={`${at}-${replay}`} title={part.title} steps={part.steps} skip={skipped} onDone={() => setWatched(true)} />
          <div class="explain-actions">
            {watched || skipped ? (
              <>
                <button
                  type="button"
                  class="btn btn-secondary"
                  data-testid="lesson-replay"
                  onClick={() => {
                    playSfx('tap');
                    stopSpeaking();
                    setWatched(false);
                    setSkipped(false);
                    setReplay((r) => r + 1);
                  }}
                >
                  ↻ שוב
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  data-testid="lesson-next"
                  onClick={() => {
                    playSfx('tap');
                    next();
                  }}
                >
                  הבא ←
                </button>
              </>
            ) : (
              <button
                type="button"
                class="btn btn-ghost"
                data-testid="lesson-skip"
                onClick={() => {
                  playSfx('tap');
                  stopSpeaking();
                  setSkipped(true);
                }}
              >
                {byGender(profile, 'דלג', 'דלגי', 'דלגו')} ⏭
              </button>
            )}
          </div>
        </>
      ) : (
        question && (
          <>
            <h2 class="lesson-turn">
              עכשיו תורך! <span class="lesson-turn-sub">{part.title}</span>
            </h2>
            <Ask
              key={question.id}
              question={question}
              mode="bubbles"
              profile={profile}
              onMessage={setMessage}
              onRight={(wrongBefore, from) => {
                setMessage(msg(wrongBefore === 0 ? 'כל הכבוד!' : 'יפה מאוד!', 'good'));
                emit({ type: 'correct', streak: 1 }, { el: from, to: dots.current?.children[at] });
                timers.current.push(window.setTimeout(next, reducedMotion() ? 700 : 1300));
              }}
              onNext={next}
              nextLabel="הבא ←"
            />
          </>
        )
      )}

      <div class="game-hero-row">
        <Hero def={world.hero!} gender={profile.gender} state={mood.state} key={mood.n} class="game-hero" />
        <div class="speech-bubble">
          <Feedback message={message} idle={part.kind === 'watch' ? watchIdle : pickIdle} />
        </div>
      </div>
    </main>
  );
}

/** The end of a lesson: one star, a fanfare, and the way to practice. */
function LessonDone({ profile, title, toMap, onPractice, onHome }: { profile: Profile; title: string; toMap: boolean; onPractice: () => void; onHome: () => void }) {
  const world = useWorld();
  const mood = useHeroMood();
  const star = useRef<HTMLSpanElement>(null);
  const [on, setOn] = useState(false);
  const speech = 'כל הכבוד, סיימת את השיעור!';
  useAutoSpeak(speech, 'lesson-done');
  useEffect(() => {
    setHeroMood('happy');
    const fast = reducedMotion();
    const t1 = window.setTimeout(() => {
      setOn(true);
      emit({ type: 'starEarned', n: 1 }, { el: star.current });
    }, fast ? 200 : 500);
    const t2 = window.setTimeout(() => emit({ type: 'roundDone', stars: 1 }), fast ? 450 : 1100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  return (
    <main class="screen celebrate is-over lesson-done" data-testid="lesson-done">
      <h1 class="celebrate-title">סיימת את השיעור!</h1>
      <div class="celebrate-stars" role="img" aria-label="כוכב על השיעור">
        <span ref={star} class={`big-star ${on ? 'is-on' : ''}`}>
          ★
        </span>
      </div>
      <Hero def={world.hero!} gender={profile.gender} state={mood.state} key={mood.n} class="celebrate-hero" />
      <p class="celebrate-sub">
        📖 {title} <SpeakButton text={speech} class="speak-inline" />
      </p>
      {toMap ? (
        <div class="row celebrate-actions">
          <button type="button" class="btn btn-primary btn-big" data-testid="lesson-to-map" onClick={onHome}>
            🗺️ ממשיכים במסע
          </button>
        </div>
      ) : (
        <div class="row celebrate-actions">
          <button type="button" class="btn btn-primary btn-big" data-testid="lesson-practice" onClick={onPractice}>
            ▶ {byGender(profile, 'בוא נתרגל', 'בואי נתרגל', 'בואו נתרגל')}
          </button>
          <button type="button" class="btn btn-secondary btn-big" data-testid="lesson-to-home" onClick={onHome}>
            🏠 לבית
          </button>
        </div>
      )}
    </main>
  );
}
