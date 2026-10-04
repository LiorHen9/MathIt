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
import { playSfx, comboPitch, countPitch, hitPitch, jumpPitch, starPitch, hushSfx, type SfxName, type SfxOpts } from '../audio/sfx';
import { setHeroMood, type HeroState } from './Hero';
import { centerOf, dodge, pop, shake, flyTo, tremble, wobble } from './motion';
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
  | { type: 'explained' }
  // The quest map (phase 4).
  /** The hero sets off along the path; `ms` = how long the walk takes, `steps` = footsteps. */
  | { type: 'walk'; steps: number; ms: number }
  /** One footstep on the way (1, 2, 3…). */
  | { type: 'step'; n: number }
  /** A station opens (a burst of light at it). */
  | { type: 'unlock' }
  /** A closed station was tapped. */
  | { type: 'locked' }
  /** A chest rattles before it opens. */
  | { type: 'chestShake' }
  /** A chest opens and its prize flies out (`prize`: the token that flies). */
  | { type: 'chestOpen'; prize: string }
  /** The boss shows up. */
  | { type: 'bossAppear' }
  /** A right answer hits the boss: hit `n` (1, 2…), `left` = power left. */
  | { type: 'bossHit'; n: number; left: number }
  /** A wrong answer: the boss slips aside (beside the soft "wrong"). */
  | { type: 'bossDodge' }
  /** The boss is beaten. */
  | { type: 'bossDefeated'; stars: number };

export type FeedbackType = FeedbackEvent['type'];
export const FEEDBACK_TYPES: readonly FeedbackType[] = [
  'tap',
  'correct',
  'wrong',
  'hint',
  'starEarned',
  'roundDone',
  'count',
  'jump',
  'ten',
  'whoosh',
  'explain',
  'explained',
  'walk',
  'step',
  'unlock',
  'locked',
  'chestShake',
  'chestOpen',
  'bossAppear',
  'bossHit',
  'bossDodge',
  'bossDefeated'
];

/** Teaching sounds: the hero is busy explaining, so these leave its mood alone. */
export const TEACHING_TYPES: readonly FeedbackType[] = ['count', 'jump', 'ten', 'whoosh'];
/** The hero's explaining moods: no sound of their own (the hero is speaking). */
export const EXPLAIN_TYPES: readonly FeedbackType[] = ['explain', 'explained'];
/** Sounds that go along with another event, which already set the hero's mood (walk, wrong). */
export const COMPANION_TYPES: readonly FeedbackType[] = ['step', 'bossDodge'];

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
  { type: 'explained' },
  { type: 'walk', steps: 6, ms: 1800 },
  { type: 'step', n: 1 },
  { type: 'step', n: 2 },
  { type: 'unlock' },
  { type: 'locked' },
  { type: 'chestShake' },
  { type: 'chestOpen', prize: '🌈' },
  { type: 'bossAppear' },
  { type: 'bossHit', n: 1, left: 7 },
  { type: 'bossHit', n: 8, left: 0 },
  { type: 'bossDodge' },
  { type: 'bossDefeated', stars: 3 }
];

/** Where the event happened on screen, for motion and particles (optional). */
export interface FxTargets {
  /** The element involved: the bubble tapped, the key, the star, the station, the chest, the boss. */
  el?: Element | null;
  /** Where a reward flies to (the round's progress dot, the prize shelf). */
  to?: Element | null;
}

export type Motion = 'pop' | 'shake' | 'wobble' | 'tremble' | 'dodge';

/** What the director does for one event: data, so tests can read it without a browser. */
export interface FxPlan {
  sound: SfxName | null;
  soundOpts?: SfxOpts;
  hero: HeroState | null;
  /** How long the hero's mood lasts, when not its usual length (a walk). */
  heroMs?: number;
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
    case 'walk':
      return { sound: 'step', soundOpts: { step: 0 }, hero: 'walk', heroMs: e.ms };
    case 'step':
      return { sound: 'step', soundOpts: { step: e.n }, hero: null };
    case 'unlock':
      // A burst of light at the station that opened.
      return { sound: 'unlock', hero: 'cheer', motion: 'pop', particles: { kind: 'sparkle', count: 48, at: 'el' } };
    case 'locked':
      return { sound: 'locked', hero: 'think', motion: 'shake' };
    case 'chestShake':
      return { sound: 'chestShake', hero: 'think', motion: 'wobble' };
    case 'chestOpen':
      return { sound: 'chestOpen', hero: 'cheer', particles: { kind: 'sparkle', count: 50, at: 'el' }, fly: e.prize };
    case 'bossAppear':
      return { sound: 'bossAppear', hero: 'think', motion: 'pop' };
    case 'bossHit':
      return { sound: 'hit', soundOpts: { step: e.n }, hero: 'attack', motion: 'tremble', particles: { kind: 'sparkle', count: 18 + e.n * 2, at: 'el' } };
    case 'bossDodge':
      return { sound: 'dodge', hero: null, motion: 'dodge' };
    case 'bossDefeated':
      return { sound: 'victory', hero: 'cheer', particles: { kind: 'confetti', count: 150, at: 'screen' } };
  }
}

export interface FxLogEntry {
  type: FeedbackType;
  /** The event's own fields (streak, attempt, n, stars, skipped, key). */
  detail: Record<string, unknown>;
  world: string;
  sound: SfxName | null;
  /** The base frequency of the sound when it climbs (correct, star, count, jump, bossHit). */
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

const MOTIONS: Record<Motion, (el: Element) => unknown> = { pop: (el) => pop(el), shake, wobble, tremble, dodge };

/** Emit a feedback event: sound, hero, motion and particles, as the mapping says. */
export function emit(e: FeedbackEvent, at: FxTargets = {}): FxPlan {
  const plan = planFeedback(e, world);
  if (plan.sound) playSfx(plan.sound, plan.soundOpts);
  if (plan.hero) setHeroMood(plan.hero, plan.heroMs);
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
      e.type === 'correct' ? comboPitch(e.streak) : e.type === 'starEarned' ? starPitch(e.n) : e.type === 'count' ? countPitch(e.n) : e.type === 'jump' ? jumpPitch(e.n) : e.type === 'bossHit' ? hitPitch(e.n) : undefined,
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
