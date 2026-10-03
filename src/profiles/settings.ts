// The active profile and its settings (adapted from ChessIt's settings.ts).
// Activating a profile switches the real modules: sound effects (on/off, volume), narration and
// reduced motion. With no profile ("who is playing?", the editor) the defaults apply.
// Settings live inside the profile record, so changing one saves the profile.
import { useEffect, useState } from 'preact/hooks';
import { setSfxEnabled, setSfxVolume } from '../audio/sfx';
import { setNarration } from '../audio/speech';
import { setReducedMotion } from '../fx/motion';
import { saveProfile, type Profile, type ProfileSettings } from './profiles';

let active: Profile | null = null;
const listeners = new Set<() => void>();

export function activeProfile(): Profile | null {
  return active;
}

export function activeSettings(): ProfileSettings | null {
  return active?.settings ?? null;
}

export function onActiveChange(f: () => void): () => void {
  listeners.add(f);
  return () => void listeners.delete(f);
}

function apply(p: Profile | null): void {
  active = p;
  const s = p?.settings;
  setSfxEnabled(s?.sfx ?? true);
  setSfxVolume(s?.volume ?? 0.8);
  setNarration(s?.narration ?? false);
  setReducedMotion(s?.reducedMotion ?? null);
  // Music arrives in phase 5; its setting is only saved for now.
  listeners.forEach((f) => f());
}

/** Switch to a profile's settings (or the defaults with null). Does not save. */
export function activateProfile(p: Profile | null): void {
  apply(p);
}

/** The active profile changed elsewhere (name, world, PIN) and was saved: keep it current. */
export function replaceActive(p: Profile): void {
  if (active?.id === p.id) apply(p);
}

/** Change and save the active profile's settings. */
export async function updateSettings(patch: Partial<ProfileSettings>): Promise<void> {
  if (!active) return;
  const next: Profile = { ...active, settings: { ...active.settings, ...patch } };
  apply(next);
  await saveProfile(next);
}

/** The active profile; re-renders when it or its settings change. */
export function useActiveProfile(): Profile | null {
  const [p, setP] = useState(active);
  useEffect(() => {
    setP(active);
    return onActiveChange(() => setP(active));
  }, []);
  return p;
}

export function useSettings(): ProfileSettings | null {
  return useActiveProfile()?.settings ?? null;
}
