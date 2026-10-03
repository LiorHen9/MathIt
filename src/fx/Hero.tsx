// The world's hero: an original SVG character built from parts (legs, torso, arms, head, hair,
// prop), so every world shares one body and one set of animations and only dresses it differently.
// Colours come only from the world's --hero-* variables, so a hero inside a preview card takes
// that card's world (worldStyle) and the same hero works in light and dark mode.
//
// Phase 1 has the `idle` state (breathing, blinking, a moving prop – CSS in styles.css, transform
// and opacity only) and a hop on tap (fx/motion.ts). Phase 2 adds think · happy · cheer · oops,
// phase 5 walk and attack (docs/ARCHITECTURE.md §6.2).
//
// Coordinates: viewBox 0 0 120 160; the head is centred at (60, 50), the feet at y≈150.
// An animated group must not have a `transform` attribute (CSS transform would replace it), so
// positioned parts are a plain <g transform> around an animated <g class>.
import type { ComponentChildren } from 'preact';
import type { Gender } from '../profiles/profiles';

export type HeroState = 'idle';

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
}

export interface HeroDef {
  /** "חלוץ" / "חלוצה" – shown under the hero. */
  name: (g: Gender | undefined) => string;
  parts: (g: Gender | undefined) => HeroParts;
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
  return (
    <svg
      class={`hero is-${state} ${cls}`}
      viewBox="0 0 120 160"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      data-hero-prop={at}
    >
      <g class="h-all">
        {p.back && <g class="h-back">{p.back}</g>}
        <ellipse class="h-shadow" cx="60" cy="152" rx="30" ry="5" fill={V.ink} opacity="0.12" />
        <g class="h-legs">{p.legs ?? <DefaultLegs />}</g>
        <g class="h-upper">
          {p.hairBack && <g class="h-hair-back">{p.hairBack}</g>}
          <g class="h-torso">{p.torso}</g>
          {/* Left arm (viewer's left), resting. */}
          <path d="M42 90 Q32 100 30 111" fill="none" stroke={V.skin} stroke-width="9" stroke-linecap="round" />
          <circle cx="30" cy="112" r="5.6" fill={V.skin} />
          <g class="h-head">
            <circle cx="60" cy="50" r="30" fill={V.skin} />
            {p.face ?? <DefaultFace />}
            {p.hair}
          </g>
          {/* Right arm: down to the hand, or raised holding the prop up. */}
          <path
            d={at === 'raised' ? 'M78 90 Q93 84 95 70' : 'M78 90 Q88 100 90 111'}
            fill="none"
            stroke={V.skin}
            stroke-width="9"
            stroke-linecap="round"
          />
          {at !== 'foot' && <circle cx={hx} cy={hy} r="5.6" fill={V.skin} />}
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
      </g>
    </svg>
  );
}
