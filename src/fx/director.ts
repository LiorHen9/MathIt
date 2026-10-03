// The Feedback Director (docs/ARCHITECTURE.md §6.4): games never play a sound or start an
// animation themselves. They emit a semantic event – "the child got it right, third in a row" –
// and the director decides what it looks and sounds like: the sound, the hero's mood, particles,
// and the motion of the element involved.
//
// The mapping is one table shared by all worlds for now; the world only colours the sounds
// (`flavor`). Phase 5 gives every world its own mapping on top of this one (World.fx).
// tests/worlds/check.ts checks that every event is mapped in every world.
//
// Every event is logged to window.__mathitFx (what happened and what the director chose), the
// way window.__mathitSounds logs sounds.
import { playSfx, comboPitch, countPitch, jumpPitch, starPitch, hushSfx, type SfxName, type SfxOpts } from '../audio/sfx';
import { setHeroMood, type HeroState } from './Hero';
import { centerOf, pop, shake, flyTo } from './motion';
import { burst, clearParticles, confetti, type ParticleKind } from './particles';

export type FeedbackEvent =
  /** Any touch on a game control (a number-pad key). `key` = the digit, for the pitch. */
  | { type: 'tap'; key?: number }
  /** A right answer; `streak` = right answers in a row, this one included. */
  | { type: 'correct'; streak: number }
  /** A wrong answer; `attempt` = mistakes on this question so far (1, 2). */
  | { type: 'wrong'; attempt: number }
  /** A hint is shown. */
  | { type: 'hint' }
  /** The n-th star of the round appears (1–3). */
  | { type: 'starEarned'; n: number }
  /** The round is over. `skipped` = the child tapped through the celebration. */
  | { type: 'roundDone'; stars: number; skipped?: boolean }
  // Teaching (manipulatives/): the animation says what it shows, the director makes it heard.
  /** The n-th item is counted (1, 2, 3…). */
  | { type: 'count'; n: number }
  /** A hop on the number line lands on n. */
  | { type: 'jump'; n: number }
  /** A ten frame is full. */
  | { type: 'ten' }
  /** Something is taken away (flies off). */
  | { type: 'whoosh' }
  /** The hero explains step n (1, 2…) of an explanation. */
  | { type: 'explain'; step: number }
  /** An explanation is over. */
  | { type: 'explained' };

export type FeedbackType = FeedbackEvent['type'];
export const FEEDBACK_TYPES: readonly FeedbackType[] = ['tap', 'correct', 'wrong', 'hint', 'starEarned', 'roundDone', 'count', 'jump', 'ten', 'whoosh', 'explain', 'explained'];

/** Teaching sounds: the hero is busy explaining, so these leave its mood alone. */
export const TEACHING_TYPES: readonly FeedbackType[] = ['count', 'jump', 'ten', 'whoosh'];
/** The hero's explaining moods: no sound of their own (the hero is speaking). */
export const EXPLAIN_TYPES: readonly FeedbackType[] = ['explain', 'explained'];

/** Examples of every event, for tests and the docs. */
export const SAMPLE_EVENTS: readonly FeedbackEvent[] = [
  { type: 'tap', key: 3 },
  { type: 'correct', streak: 1 },
  { type: 'correct', streak: 4 },
  { type: 'wrong', attempt: 1 },
  { type: 'wrong', attempt: 2 },
  { type: 'hint' },
  { type: 'starEarned', n: 2 },
  { type: 'roundDone', stars: 3 },
  { type: 'roundDone', stars: 0 },
  { type: 'roundDone', stars: 2, skipped: true },
  { type: 'count', n: 1 },
  { type: 'count', n: 7 },
  { type: 'jump', n: 0 },
  { type: 'jump', n: 10 },
  { type: 'ten' },
  { type: 'whoosh' },
  { type: 'explain', step: 1 },
  { type: 'explained' }
];

/** Where the event happened on screen, for motion and particles (optional). */
export interface FxTargets {
  /** The element involved: the bubble tapped, the key, the star. */
  el?: Element | null;
  /** Where a reward flies to (the round's progress dot). */
  to?: Element | null;
}

export type Motion = 'pop' | 'shake';

/** What the director does for one event: data, so tests can read it without a browser. */
export interface FxPlan {
  sound: SfxName | null;
  soundOpts?: SfxOpts;
  hero: HeroState | null;
  motion?: Motion;
  particles?: { kind: ParticleKind; count: number; at: 'el' | 'screen' };
  /** Fly a token from `el` to `to`. */
  fly?: string;
}

/**
 * The shared mapping (every world, until phase 5). Pure: the same event and world always give
 * the same plan.
 */
export function planFeedback(e: FeedbackEvent, worldId: string): FxPlan {
  switch (e.type) {
    case 'tap':
      return { sound: 'click', soundOpts: { step: e.key }, hero: null, motion: 'pop' };
    case 'correct': {
      const big = e.streak >= 3;
      return {
        sound: 'correct',
        soundOpts: { step: e.streak, flavor: worldId },
        hero: big ? 'cheer' : 'happy',
        motion: 'pop',
        // The celebration grows with the streak.
        particles: { kind: 'sparkle', count: Math.min(40, 14 + e.streak * 4), at: 'el' },
        fly: '⭐'
      };
    }
    case 'wrong':
      return { sound: 'wrong', hero: 'oops', motion: 'shake' };
    case 'hint':
      return { sound: 'hint', hero: 'think' };
    case 'starEarned':
      return { sound: 'star', soundOpts: { step: e.n }, hero: 'happy', motion: 'pop', particles: { kind: 'sparkle', count: 22, at: 'el' } };
    case 'roundDone':
      if (e.skipped) return { sound: null, hero: e.stars > 0 ? 'happy' : 'idle' };
      return e.stars > 0
        ? { sound: 'fanfare', hero: 'cheer', particles: { kind: 'confetti', count: 40 + e.stars * 25, at: 'screen' } }
        : // No stars: still warm – a hint-like "let's try again", no fanfare.
          { sound: 'hint', hero: 'happy' };
    case 'count':
      return { sound: 'count', soundOpts: { step: e.n }, hero: null };
    case 'jump':
      return { sound: 'jump', soundOpts: { step: e.n }, hero: null };
    case 'ten':
      return { sound: 'ten', hero: null };
    case 'whoosh':
      return { sound: 'whoosh', hero: null };
    case 'explain':
      return { sound: null, hero: 'think' };
    case 'explained':
      return { sound: null, hero: 'happy' };
  }
}

export interface FxLogEntry {
  type: FeedbackType;
  /** The event's own fields (streak, attempt, n, stars, skipped, key). */
  detail: Record<string, unknown>;
  world: string;
  sound: SfxName | null;
  /** The base frequency of the sound when it climbs (correct, star). */
  pitch?: number;
  hero: HeroState | null;
  motion?: Motion;
  particles?: number;
  t: number;
}

/** For tests: every event, newest last (capped). */
export const fxLog: FxLogEntry[] = [];
if (typeof window !== 'undefined') (window as unknown as { __mathitFx: FxLogEntry[] }).__mathitFx = fxLog;

let world = 'base';

/** The world whose flavour the feedback takes (set when a game starts). */
export function setFxWorld(id: string): void {
  world = id;
}

const MOTIONS: Record<Motion, (el: Element) => unknown> = { pop: (el) => pop(el), shake };

/** Emit a feedback event: sound, hero, motion and particles, as the mapping says. */
export function emit(e: FeedbackEvent, at: FxTargets = {}): FxPlan {
  const plan = planFeedback(e, world);
  if (plan.sound) playSfx(plan.sound, plan.soundOpts);
  if (plan.hero) setHeroMood(plan.hero);
  if (plan.motion && at.el) MOTIONS[plan.motion](at.el);
  let particles = 0;
  if (plan.particles) {
    if (plan.particles.at === 'screen') particles = confetti(plan.particles.count);
    else if (at.el) particles = burst(centerOf(at.el), plan.particles.kind, plan.particles.count);
  }
  if (plan.fly && at.el && at.to) void flyTo(at.el, at.to, plan.fly);

  const { type, ...detail } = e;
  fxLog.push({
    type,
    detail,
    world,
    sound: plan.sound,
    pitch:
      e.type === 'correct' ? comboPitch(e.streak) : e.type === 'starEarned' ? starPitch(e.n) : e.type === 'count' ? countPitch(e.n) : e.type === 'jump' ? jumpPitch(e.n) : undefined,
    hero: plan.hero,
    motion: plan.motion,
    particles,
    t: Math.round(typeof performance !== 'undefined' ? performance.now() : 0)
  });
  if (fxLog.length > 500) fxLog.shift();
  return plan;
}

/** Stop a celebration at once: sounds fade, particles vanish, the hero rests. */
export function hushFeedback(): void {
  hushSfx();
  clearParticles();
  setHeroMood('idle');
}
