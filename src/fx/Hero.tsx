// The world's hero: an original SVG character built from parts (legs, torso, arms, head, hair,
// prop), so every world shares one body and one set of animations and only dresses it differently.
// Colours come only from the world's --hero-* variables, so a hero inside a preview card takes
// that card's world (worldStyle) and the same hero works in light and dark mode.
//
// States (CSS in styles.css, transform and opacity only): `idle` (breathing, blinking, a moving
// prop), `think` (head tilted, a slow sway), `happy` (a hop), `cheer` (jumping for joy), `oops`
// (a small flinch and head shake – gentle, never scary), `walk` (a bouncing stride with a sway,
// on the quest map), `attack` (toward the boss, who stands to its left). A hop on tap is
// fx/motion.ts. Walk and attack are each world's own (HeroDef.walk / .attack, phase 5): the
// fairy floats instead of walking and casts a spell, the striker jogs and kicks the ball at the
// boss, the player dribbles and shoots, the ninja sneaks and throws the star, the builder stomps
// and swings the pickaxe, the singer dances and sends out a sound wave.
// The Feedback Director (fx/director.ts) sets the mood with setHeroMood; a hero drawn with
// useHeroMood follows it and goes back to idle by itself.
//
// Coordinates: viewBox 0 0 120 160; the head is centred at (60, 50), the feet at y≈150.
// An animated group must not have a `transform` attribute (CSS transform would replace it), so
// positioned parts are a plain <g transform> around an animated <g class>.
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Gender } from '../profiles/profiles';

export type HeroState = 'idle' | 'think' | 'happy' | 'cheer' | 'oops' | 'walk' | 'attack';
export const HERO_STATES: readonly HeroState[] = ['idle', 'think', 'happy', 'cheer', 'oops', 'walk', 'attack'];

/**
 * How long each mood lasts before the hero is idle again (ms). A walk usually gets its own length
 * (the time the hero takes along the path – setHeroMood's `ms`).
 */
export const MOOD_MS: Record<HeroState, number> = { idle: 0, think: 2600, happy: 900, cheer: 1700, oops: 800, walk: 2400, attack: 650 };

/** The shared mood: one hero on screen at a time follows it. `n` changes on every set, so the
 * same mood twice in a row replays its animation. */
export interface Mood {
  state: HeroState;
  n: number;
}

let mood: Mood = { state: 'idle', n: 0 };
let moodTimer: ReturnType<typeof setTimeout> | undefined;
const moodListeners = new Set<() => void>();

/** Set the hero's mood; it returns to idle after `ms` (default: the mood's own length). */
export function setHeroMood(state: HeroState, ms = MOOD_MS[state]): void {
  clearTimeout(moodTimer);
  mood = { state, n: mood.n + 1 };
  moodListeners.forEach((f) => f());
  if (state !== 'idle' && ms > 0) moodTimer = setTimeout(() => setHeroMood('idle'), ms);
}

export function heroMood(): Mood {
  return mood;
}

/** The current mood; re-renders when it changes. */
export function useHeroMood(): Mood {
  const [m, setM] = useState(mood);
  useEffect(() => {
    const f = () => setM(mood);
    moodListeners.add(f);
    f();
    return () => void moodListeners.delete(f);
  }, []);
  return m;
}

export interface HeroParts {
  /** Behind everything (wings, a cape). */
  back?: ComponentChildren;
  /** Hair behind the head (long hair, a ponytail). */
  hairBack?: ComponentChildren;
  /** Replaces the default legs (skin legs and dark shoes). */
  legs?: ComponentChildren;
  torso: ComponentChildren;
  /** Hair and anything on the head (in front of the face's top). */
  hair: ComponentChildren;
  /** Replaces the default face (eyes, cheeks, smile) – e.g. a ninja mask around the eyes. */
  face?: ComponentChildren;
  /** Drawn around (0, 0) and placed at the hand (or at the right foot). */
  prop: ComponentChildren;
  propAt?: 'hand' | 'raised' | 'foot';
  /** 'blocky': a square head, straight arms and square hands (a world built of cubes). */
  shape?: 'round' | 'blocky';
}

/** How the hero gets along the map path. */
export type WalkStyle = 'walk' | 'float' | 'jog' | 'dribble' | 'sneak' | 'stomp' | 'dance';
/** How the hero hits the boss. */
export type AttackStyle = 'lunge' | 'spell' | 'kick' | 'shoot' | 'throw' | 'swing' | 'wave';
export const WALK_STYLES: readonly WalkStyle[] = ['walk', 'float', 'jog', 'dribble', 'sneak', 'stomp', 'dance'];
export const ATTACK_STYLES: readonly AttackStyle[] = ['lunge', 'spell', 'kick', 'shoot', 'throw', 'swing', 'wave'];

export interface HeroDef {
  /** "חלוץ" / "חלוצה" – shown under the hero. */
  name: (g: Gender | undefined) => string;
  parts: (g: Gender | undefined) => HeroParts;
  /** The world's way of walking (CSS `.walk-<style>`); default a bouncing stride. */
  walk?: WalkStyle;
  /** The world's attack (CSS `.atk-<style>`); default a lunge with the prop swung. */
  attack?: AttackStyle;
  /** What flies at the boss in the attack (a spell, a sound wave), drawn around (0, 0) at the hand. */
  shot?: ComponentChildren;
}

const V = {
  skin: 'var(--hero-skin)',
  hair: 'var(--hero-hair)',
  main: 'var(--hero-main)',
  trim: 'var(--hero-trim)',
  prop: 'var(--hero-prop)',
  ink: 'var(--hero-ink)',
  light: 'var(--hero-light)'
} as const;
export const HERO = V;

/** Eyes (blinking), cheeks and a smile. Exported for worlds that only add to the face. */
export function DefaultEyes() {
  return (
    <g class="h-eyes">
      <ellipse cx="49" cy="54" rx="4.2" ry="5.4" fill={V.ink} />
      <ellipse cx="71" cy="54" rx="4.2" ry="5.4" fill={V.ink} />
      <circle cx="50.6" cy="52" r="1.6" fill={V.light} />
      <circle cx="72.6" cy="52" r="1.6" fill={V.light} />
    </g>
  );
}

function DefaultFace() {
  return (
    <>
      <DefaultEyes />
      <circle cx="42" cy="63" r="4.5" fill={V.trim} opacity="0.35" />
      <circle cx="78" cy="63" r="4.5" fill={V.trim} opacity="0.35" />
      <path d="M53 65 Q60 71.5 67 65" fill="none" stroke={V.ink} stroke-width="2.6" stroke-linecap="round" />
    </>
  );
}

function DefaultLegs() {
  return (
    <>
      <rect x="47" y="114" width="10" height="34" rx="4" fill={V.skin} />
      <rect x="63" y="114" width="10" height="34" rx="4" fill={V.skin} />
      <ellipse cx="51" cy="149" rx="9" ry="5" fill={V.ink} />
      <ellipse cx="69" cy="149" rx="9" ry="5" fill={V.ink} />
    </>
  );
}

const HAND = { hand: [90, 112], raised: [95, 66], foot: [90, 140] } as const;

/** An SVG path for a star with `points` tips (5 = a classic star, 4 = a ninja star). */
export function starPath(cx: number, cy: number, r: number, points = 5, inner = 0.45): string {
  const d: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    d.push(`${i === 0 ? 'M' : 'L'}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return d.join(' ') + 'Z';
}

interface Props {
  def: HeroDef;
  gender?: Gender;
  state?: HeroState;
  class?: string;
  /** Accessible name; without it the hero is decorative (aria-hidden). */
  label?: string;
}

export function Hero({ def, gender, state = 'idle', class: cls = '', label }: Props) {
  const p = def.parts(gender);
  const at = p.propAt ?? 'hand';
  const [hx, hy] = HAND[at === 'foot' ? 'hand' : at];
  const [px, py] = HAND[at];
  const blocky = p.shape === 'blocky';
  // Arms: a curve to a round hand, or a straight block to a square one.
  const leftArm = blocky ? 'M41 88 L31 110' : 'M42 90 Q32 100 30 111';
  const rightArm = blocky ? (at === 'raised' ? 'M79 88 L95 70' : 'M79 88 L89 110') : at === 'raised' ? 'M78 90 Q93 84 95 70' : 'M78 90 Q88 100 90 111';
  const cap = blocky ? 'square' : 'round';
  const hand = (x: number, y: number) =>
    blocky ? <rect x={x - 6} y={y - 6} width="12" height="12" rx="1.5" fill={V.skin} /> : <circle cx={x} cy={y} r="5.6" fill={V.skin} />;
  const walk = def.walk ?? 'walk';
  const attack = def.attack ?? 'lunge';
  return (
    <svg
      class={`hero is-${state} walk-${walk} atk-${attack} ${cls}`}
      viewBox="0 0 120 160"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      data-hero-prop={at}
      data-walk={walk}
      data-attack={attack}
    >
      <g class="h-all">
        {p.back && <g class="h-back">{p.back}</g>}
        <ellipse class="h-shadow" cx="60" cy="152" rx="30" ry="5" fill={V.ink} opacity="0.12" />
        <g class="h-legs">{p.legs ?? <DefaultLegs />}</g>
        <g class="h-upper">
          {p.hairBack && <g class="h-hair-back">{p.hairBack}</g>}
          <g class="h-torso">{p.torso}</g>
          {/* Left arm (viewer's left), resting. */}
          <path d={leftArm} fill="none" stroke={V.skin} stroke-width="9" stroke-linecap={cap} />
          {hand(30, 112)}
          <g class="h-head">
            {blocky ? <rect x="31" y="21" width="58" height="58" rx="3" fill={V.skin} /> : <circle cx="60" cy="50" r="30" fill={V.skin} />}
            {p.face ?? <DefaultFace />}
            {p.hair}
          </g>
          {/* Right arm: down to the hand, or raised holding the prop up. */}
          <path d={rightArm} fill="none" stroke={V.skin} stroke-width="9" stroke-linecap={cap} />
          {at !== 'foot' && hand(hx, hy)}
          {at !== 'foot' && (
            <g transform={`translate(${px} ${py})`}>
              <g class="h-prop">{p.prop}</g>
            </g>
          )}
        </g>
        {at === 'foot' && (
          <g transform={`translate(${px} ${py})`}>
            <g class="h-prop">{p.prop}</g>
          </g>
        )}
        {def.shot && (
          <g transform={`translate(${px} ${py - 20})`}>
            <g class="h-shot">{def.shot}</g>
          </g>
        )}
      </g>
    </svg>
  );
}
