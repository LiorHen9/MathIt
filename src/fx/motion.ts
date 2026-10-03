// Reduced motion, for the whole app. The phone's setting (prefers-reduced-motion) is the default;
// each profile can override it (profiles/settings.ts). CSS reads :root[data-motion="reduced"] – feedback
// animations become short fades, but teaching animations (manipulatives/) keep moving, slowly,
// because they are the lesson (docs/ARCHITECTURE.md §6.6).
// Phase 2 adds the animation presets here (pop, shake, flyTo, arc, countUp).

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

/**
 * A happy hop (the hero when tapped): up, squash on landing, settle. Transform only, ~500ms.
 * With reduced motion: a short gentle pulse instead. Phase 2 adds the other presets here.
 */
export function hop(el: Element | null | undefined): void {
  if (!el || typeof (el as HTMLElement).animate !== 'function') return;
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
