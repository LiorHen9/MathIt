// "A child's progress just changed" – a small signal from the stores (phase 10), so the app can look
// for new achievements (app/App.tsx → storage/achievements.ts) without the stores knowing about
// achievements or the screens. A window event; nothing happens outside a browser (the bun tests).
export const PROGRESS_EVENT = 'mathit:progress';

export function progressChanged(profileId: string): void {
  if (typeof window === 'undefined' || typeof CustomEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: profileId }));
}
