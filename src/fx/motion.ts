// Reduced motion, for the whole app. The phone's setting (prefers-reduced-motion) is the default;
// phase 1 adds a per-profile override. CSS reads :root[data-motion="reduced"] – feedback
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
