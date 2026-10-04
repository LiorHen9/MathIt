// The runtime of the teaching animations (docs/ARCHITECTURE.md §6.1, §6.6): a small timeline over
// the Web Animations API that a manipulative's script awaits step by step.
//
// - Transform and opacity only. Every animation is committed to inline style when it ends and
//   then cancelled, so finished animations never pile up in document.getAnimations().
// - Reduced motion does NOT turn these off – they are the lesson. It makes them slower and calmer
//   (×SLOW), and the scripts pick smaller hops (`tl.calm`). Nothing here loops forever.
// - `speed`: 1 = a lesson's pace; hints run a little slower (calm), tests never change it.
// - Stopping (the question was answered, the child skipped, the screen closed) ends every
//   animation and wait at once; the script's next await throws `Stopped`, and the component
//   shows its end state with the `.is-final` class.
import type { RefObject } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import { reducedMotion } from '../fx/motion';

/** How much slower teaching animations run with reduced motion. */
export const SLOW = 1.6;

export class Stopped extends Error {
  constructor() {
    super('stopped');
  }
}

export class Timeline {
  dead = false;
  /** Reduced motion: smaller movements, no bounce. */
  readonly calm: boolean;
  private readonly k: number;
  private readonly anims = new Set<Animation>();
  private readonly waits = new Map<number, () => void>();
  /** The total time asked for so far (ms, after scaling) – for tests and docs. */
  planned = 0;

  constructor(speed = 1) {
    this.calm = reducedMotion();
    this.k = (this.calm ? SLOW : 1) / Math.max(0.25, speed);
  }

  /** A base duration (ms at speed 1, normal motion) → the real one. */
  ms(base: number): number {
    return Math.round(base * this.k);
  }

  private check(): void {
    if (this.dead) throw new Stopped();
  }

  /** Wait a (scaled) moment. */
  wait(base: number): Promise<void> {
    this.check();
    const ms = this.ms(base);
    this.planned += ms;
    return new Promise<void>((resolve) => {
      const id = window.setTimeout(() => {
        this.waits.delete(id);
        resolve();
      }, ms);
      this.waits.set(id, resolve);
    }).then(() => this.check());
  }

  /**
   * Animate one element (transform/opacity keyframes) for a scaled `base` ms and wait for it.
   * The end state stays (committed to the element's style).
   */
  async anim(el: Element | null | undefined, frames: Keyframe[], base: number, opts: { easing?: string; delay?: number } = {}): Promise<void> {
    this.check();
    if (!el || typeof (el as HTMLElement).animate !== 'function') return;
    const a = (el as HTMLElement).animate(frames, {
      duration: this.ms(base),
      delay: opts.delay ? this.ms(opts.delay) : 0,
      easing: opts.easing ?? 'ease-out',
      fill: 'forwards'
    });
    this.anims.add(a);
    try {
      await a.finished;
    } catch {
      /* cancelled by stop() */
    }
    this.settle(a);
    this.check();
  }

  /**
   * Start an animation without waiting for it (a label fading in while the script goes on).
   * Stopping it is not an error (an un-awaited `anim` would reject with Stopped, unhandled).
   */
  bg(el: Element | null | undefined, frames: Keyframe[], base: number, opts: { easing?: string; delay?: number } = {}): void {
    if (this.dead) return;
    this.anim(el, frames, base, opts).catch(() => {});
  }

  /** Commit an animation's end state and drop it. */
  private settle(a: Animation): void {
    if (!this.anims.delete(a)) return;
    try {
      if (a.playState !== 'finished') a.finish();
      a.commitStyles();
    } catch {
      /* the element left the page */
    }
    a.cancel();
  }

  /** Stop everything now: animations jump to their end, waits end, the script stops. */
  stop(): void {
    if (this.dead) return;
    this.dead = true;
    for (const a of [...this.anims]) this.settle(a);
    for (const [id, resolve] of this.waits) {
      clearTimeout(id);
      resolve();
    }
    this.waits.clear();
  }
}

export interface RunProps {
  /** 1 = lesson pace; below 1 is slower (hints). */
  speed?: number;
  /** Change it to play again from the start. */
  play?: number;
  /** Show the end at once and stop (the question was answered). */
  stopped?: boolean;
  /** Called once the animation has played to its end (not when stopped). */
  onDone?: () => void;
}

/** Inline styles a script may have left: cleared before playing again. */
function reset(root: HTMLElement): void {
  root.classList.remove('is-final', 'is-done');
  for (const el of root.querySelectorAll<HTMLElement>('*')) {
    el.style.removeProperty('transform');
    el.style.removeProperty('opacity');
    el.classList.remove('is-hit', 'is-lit');
  }
}

/**
 * Run a manipulative's script on its root element: on mount, again when `play` changes, stopped
 * when `stopped` turns true or the component goes away. Layout effects, so a stop lands before
 * the browser paints the next frame (and before tests look).
 */
export function useRun(root: RefObject<HTMLElement>, script: (tl: Timeline, root: HTMLElement) => Promise<void>, props: RunProps): void {
  const tl = useRef<Timeline | null>(null);
  const onDone = useRef(props.onDone);
  onDone.current = props.onDone;

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    reset(el);
    const t = new Timeline(props.speed);
    tl.current = t;
    if (props.stopped) {
      t.stop();
      el.classList.add('is-final');
      return;
    }
    el.dataset.state = 'playing';
    script(t, el).then(
      () => {
        if (t.dead) return;
        el.dataset.state = 'done';
        el.dataset.ms = String(t.planned);
        el.classList.add('is-done');
        onDone.current?.();
      },
      (e) => {
        if (!(e instanceof Stopped)) console.error('[manipulative]', e);
      }
    );
    return () => t.stop();
  }, [props.play]);

  useLayoutEffect(() => {
    if (!props.stopped || !tl.current) return;
    tl.current.stop();
    const el = root.current;
    if (el) {
      el.classList.add('is-final');
      el.dataset.state = 'stopped';
    }
  }, [props.stopped]);
}

/** Keyframes: pop into view (from nothing), with a small hop unless calm. */
export function popIn(calm: boolean, lift = 12): Keyframe[] {
  return calm
    ? [
        { opacity: 0, transform: 'scale(0.85)' },
        { opacity: 1, transform: 'scale(1)' }
      ]
    : [
        { opacity: 0, transform: `translateY(${lift}px) scale(0.3)` },
        { opacity: 1, transform: `translateY(-${lift}px) scale(1.15)`, offset: 0.55 },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ];
}

/** Keyframes: a short swell and back (being counted). */
export function pulse(calm: boolean, scale = 1.3): Keyframe[] {
  const s = calm ? 1 + (scale - 1) * 0.4 : scale;
  return [{ transform: 'scale(1)' }, { transform: `scale(${s})`, offset: 0.4 }, { transform: 'scale(1)' }];
}

/** Keyframes: fade in (labels, numbers). */
export const FADE_IN: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];

/** Keyframes: from where the element is now (`from`, a transform) to its place. */
export function settleFrom(from: string): Keyframe[] {
  return [{ transform: from }, { transform: 'translate(0, 0) rotate(0deg)' }];
}

/** Keyframes: a parabola from (0,0) to (dx,dy) rising `lift` px – a hop or a throw. */
export function arcFrames(dx: number, dy: number, lift: number, extra: (t: number) => string = () => '', opacity?: (t: number) => number): Keyframe[] {
  const frames: Keyframe[] = [];
  const N = 10;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const y = dy * t - lift * 4 * t * (1 - t);
    const f: Keyframe = { transform: `translate(${(dx * t).toFixed(1)}px, ${y.toFixed(1)}px) ${extra(t)}`.trim(), offset: t };
    if (opacity) f.opacity = opacity(t);
    frames.push(f);
  }
  return frames;
}
