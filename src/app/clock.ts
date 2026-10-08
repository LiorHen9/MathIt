// The app's clock: Date.now(), unless a test moved it. Spaced review (core/mastery) depends on
// days passing, so e2e tests can shift the clock: `?clockDays=3` in the URL (kept for the
// session) or localStorage `mathit-clock-days`. Only for tests – nothing in the app sets it.
const KEY = 'mathit-clock-days';

function offsetDays(): number {
  try {
    const fromUrl = new URLSearchParams(location.search).get('clockDays');
    if (fromUrl !== null) localStorage.setItem(KEY, fromUrl);
    const d = Number(localStorage.getItem(KEY) ?? 0);
    return Number.isFinite(d) ? d : 0;
  } catch {
    return 0;
  }
}

export function now(): number {
  return Date.now() + offsetDays() * 24 * 60 * 60 * 1000;
}
