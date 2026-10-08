// How long the child on this phone has been playing, for the parents' break reminder (phase 8).
// In memory only: it starts when a profile's map first shows and starts again for another child
// or a new visit (a reload). Nothing here is saved.
let who = '';
let started = 0;
let offered = 0;

/** The map of `profileId` is showing: start its clock unless it is already running. */
export function playStart(profileId: string, now: number): void {
  if (who === profileId) return;
  who = profileId;
  started = now;
  offered = 0;
}

export function playClock(): { started: number; offered: number } {
  return { started, offered };
}

/** A break was offered: the next offer counts from now. */
export function breakOffered(now: number): void {
  offered = now;
}
