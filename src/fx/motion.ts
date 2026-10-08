// Reduced motion, for the whole app. The phone's setting (prefers-reduced-motion) is the default;
// each profile can override it (profiles/settings.ts). CSS reads :root[data-motion="reduced"] – feedback
// animations become short fades, but teaching animations (manipulatives/) keep moving, slowly,
// because they are the lesson (docs/ARCHITECTURE.md §6.6).
//
// Animation presets on the Web Animations API (docs/ARCHITECTURE.md §6.5): pop, shake, flyTo, arc,
// countUp. Transform and opacity only; with reduced motion each one becomes a short fade (≤ 200ms)
// or happens at once. They return the Animation (or null), so callers can await `.finished`.

let override: boolean | null = null;
const query = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

function apply(): void {
  const reduced = reducedMotion();
  if (reduced) document.documentElement.dataset.motion = 'reduced';
  else delete document.documentElement.dataset.motion;
}

/** True when feedback animations should be short. */
export function reducedMotion(): boolean {
  return override ?? !!query?.matches;
}

/** A profile's choice: true / false, or null to follow the phone. */
export function setReducedMotion(value: boolean | null): void {
  override = value;
  apply();
}

/** Called once at start: set the attribute and follow changes to the phone's setting. */
export function initMotion(): void {
  apply();
  query?.addEventListener?.('change', apply);
}

export interface Point {
  x: number;
  y: number;
}

function canAnimate(el: Element | null | undefined): el is HTMLElement {
  return !!el && typeof (el as HTMLElement).animate === 'function';
}

/** The centre of an element on the screen. */
export function centerOf(el: Element): Point {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** A short dim-and-back, the reduced-motion stand-in for every preset. */
function fade(el: HTMLElement, ms = 180): Animation {
  return el.animate([{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: ms, easing: 'ease-out' });
}

/**
 * A happy hop (the hero when tapped): up, squash on landing, settle. Transform only, ~500ms.
 * With reduced motion: a short gentle pulse instead.
 */
export function hop(el: Element | null | undefined): void {
  if (!canAnimate(el)) return;
  if (reducedMotion()) {
    el.animate([{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], { duration: 200 });
    return;
  }
  el.animate(
    [
      { transform: 'translateY(0) scale(1, 1)' },
      { transform: 'translateY(2px) scale(1.06, 0.94)', offset: 0.12 },
      { transform: 'translateY(-26px) scale(0.96, 1.05)', offset: 0.45 },
      { transform: 'translateY(0) scale(1.07, 0.93)', offset: 0.78 },
      { transform: 'translateY(0) scale(1, 1)' }
    ],
    { duration: 520, easing: 'ease-out' }
  );
}

/** Pop: a quick swell and settle – a right answer, a new star, the combo counter. ~360ms. */
export function pop(el: Element | null | undefined, scale = 1.25): Animation | null {
  if (!canAnimate(el)) return null;
  if (reducedMotion()) return fade(el);
  return el.animate(
    [
      { transform: 'scale(1)' },
      { transform: `scale(${scale})`, offset: 0.4 },
      { transform: `scale(${1 - (scale - 1) * 0.25})`, offset: 0.75 },
      { transform: 'scale(1)' }
    ],
    { duration: 360, easing: 'ease-out' }
  );
}

/** A gentle side-to-side shake (not yet right). ~380ms, small: no alarm. */
export function shake(el: Element | null | undefined): Animation | null {
  if (!canAnimate(el)) return null;
  if (reducedMotion()) return fade(el);
  return el.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-7px) rotate(-2deg)', offset: 0.2 },
      { transform: 'translateX(6px) rotate(2deg)', offset: 0.45 },
      { transform: 'translateX(-3px)', offset: 0.7 },
      { transform: 'translateX(0)' }
    ],
    { duration: 380, easing: 'ease-in-out' }
  );
}

/** A chest rattling: quick tilts left and right with a little hop. ~600ms. */
export function wobble(el: Element | null | undefined): Animation | null {
  if (!canAnimate(el)) return null;
  if (reducedMotion()) return fade(el);
  return el.animate(
    [
      { transform: 'rotate(0deg) translateY(0)' },
      { transform: 'rotate(-9deg) translateY(-6px)', offset: 0.15 },
      { transform: 'rotate(8deg) translateY(0)', offset: 0.32 },
      { transform: 'rotate(-7deg) translateY(-5px)', offset: 0.5 },
      { transform: 'rotate(6deg) translateY(0)', offset: 0.68 },
      { transform: 'rotate(-3deg) translateY(-2px)', offset: 0.84 },
      { transform: 'rotate(0deg) translateY(0)' }
    ],
    { duration: 600, easing: 'ease-in-out' }
  );
}

/** Hit: a fast tremble with a squash (the boss takes a hit). ~420ms. */
export function tremble(el: Element | null | undefined): Animation | null {
  if (!canAnimate(el)) return null;
  if (reducedMotion()) return fade(el);
  return el.animate(
    [
      { transform: 'translateX(0) scale(1, 1)' },
      { transform: 'translateX(10px) scale(1.08, 0.9)', offset: 0.12 },
      { transform: 'translateX(-9px) scale(0.96, 1.04)', offset: 0.28 },
      { transform: 'translateX(7px) scale(1.03, 0.97)', offset: 0.44 },
      { transform: 'translateX(-5px)', offset: 0.6 },
      { transform: 'translateX(3px)', offset: 0.78 },
      { transform: 'translateX(0) scale(1, 1)' }
    ],
    { duration: 420, easing: 'ease-out' }
  );
}

/** Dodge: slip aside and back, gently (a wrong answer against the boss). ~480ms. */
export function dodge(el: Element | null | undefined): Animation | null {
  if (!canAnimate(el)) return null;
  if (reducedMotion()) return fade(el);
  return el.animate(
    [
      { transform: 'translateX(0) rotate(0deg)' },
      { transform: 'translateX(-34px) rotate(-8deg)', offset: 0.35 },
      { transform: 'translateX(-30px) rotate(-6deg)', offset: 0.55 },
      { transform: 'translateX(0) rotate(0deg)' }
    ],
    { duration: 480, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' }
  );
}

/**
 * Move an element along a curved path from `from` to `to` (screen points, its centre), rising
 * `lift` px above the straight line on the way – a jump, a throw. The element should be
 * position: fixed at `from`; the animation ends at `to` and keeps it there (fill forwards).
 */
export function arc(el: Element | null | undefined, from: Point, to: Point, opts: { lift?: number; ms?: number; endScale?: number } = {}): Animation | null {
  if (!canAnimate(el)) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (reducedMotion()) {
    return el.animate(
      [
        { transform: 'translate(0, 0)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 }
      ],
      { duration: 150, fill: 'forwards' }
    );
  }
  const lift = opts.lift ?? Math.min(160, 40 + Math.hypot(dx, dy) * 0.3);
  const end = opts.endScale ?? 1;
  const frames: Keyframe[] = [];
  const N = 8;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // A parabola: 0 at both ends, -lift in the middle.
    const y = dy * t - lift * 4 * t * (1 - t);
    const s = 1 + (end - 1) * t + 0.25 * Math.sin(Math.PI * t);
    frames.push({ transform: `translate(${(dx * t).toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(3)})`, offset: t });
  }
  return el.animate(frames, { duration: opts.ms ?? 560, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' });
}

/**
 * Fly a token (a ⭐ or a coin – any text) from one element to another along an arc, then remove
 * it. The token is position: fixed, outside the layout, and ignores touches. Resolves on landing.
 */
export function flyTo(from: Element | null | undefined, target: Element | null | undefined, token = '⭐', cls = 'fly-token'): Promise<void> {
  if (!from || !target || typeof document === 'undefined') return Promise.resolve();
  const a = centerOf(from);
  const b = centerOf(target);
  const el = document.createElement('span');
  el.className = cls;
  el.textContent = token;
  el.setAttribute('aria-hidden', 'true');
  el.style.left = `${a.x}px`;
  el.style.top = `${a.y}px`;
  document.body.append(el);
  const anim = arc(el, a, b, { endScale: 0.6 });
  if (!anim) {
    el.remove();
    return Promise.resolve();
  }
  return anim.finished.then(
    () => el.remove(),
    () => el.remove()
  );
}

/**
 * Count a number up (or down) in an element's text, then pop it. With reduced motion the new
 * number appears at once with a short fade. Returns a function that stops it (showing `to`).
 */
export function countUp(el: Element | null | undefined, from: number, to: number, ms = 400): () => void {
  if (!el) return () => {};
  const show = (n: number) => (el.textContent = String(n));
  if (reducedMotion() || from === to || typeof requestAnimationFrame !== 'function') {
    show(to);
    if (canAnimate(el)) fade(el);
    return () => {};
  }
  let raf = 0;
  const t0 = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - t0) / ms);
    show(Math.round(from + (to - from) * t));
    if (t < 1) raf = requestAnimationFrame(tick);
    else pop(el, 1.35);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    show(to);
  };
}

/**
 * A word that pops up where something happened and floats away ("גול!", "סוויש!") – the world's
 * shout on a streak. Decoration only: none with reduced motion. Transform and opacity, ~800ms.
 */
export function popWord(at: Element | null | undefined, text: string): void {
  if (!at || typeof document === 'undefined' || reducedMotion()) return;
  const c = centerOf(at);
  const el = document.createElement('span');
  el.className = 'fx-word';
  el.textContent = text;
  el.setAttribute('aria-hidden', 'true');
  el.style.left = `${c.x}px`;
  el.style.top = `${c.y}px`;
  document.body.append(el);
  if (typeof el.animate !== 'function') {
    el.remove();
    return;
  }
  el.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0.3) rotate(-8deg)', opacity: 0 },
      { transform: 'translate(-50%, -90%) scale(1.25) rotate(4deg)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%, -120%) scale(1) rotate(0deg)', opacity: 1, offset: 0.7 },
      { transform: 'translate(-50%, -170%) scale(0.9)', opacity: 0 }
    ],
    { duration: 850, easing: 'ease-out', fill: 'forwards' }
  ).finished.then(
    () => el.remove(),
    () => el.remove()
  );
}
