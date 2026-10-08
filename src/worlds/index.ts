// World registry and switching (adapted from ChessIt's themes). Only the base look is in the main
// bundle; every world is its own small chunk, loaded when a profile that uses it becomes active
// (or when the picker shows previews). Switching = new CSS variables on <html>, no reload.
import { useEffect, useState } from 'preact/hooks';
import { setSoundPack } from '../audio/sfx';
import { setMusicLoop } from '../audio/music';
import { DEFAULT_WORDS, type StoryWords } from '../core/story';
import type { Gender } from '../profiles/profiles';
import { BASE } from './base';
import type { BossDef, WorldId, WorldTheme, WorldVars } from './types';

export type { BossDef, Collectible, WorldId, WorldTheme } from './types';
export { BASE } from './base';

/**
 * Shown before the world itself is loaded (picker placeholders). Order = picker order.
 * Adding a world: a folder src/worlds/<id>/ exporting `world`, a line here and one in LOADERS.
 */
export const WORLD_LIST: { id: Exclude<WorldId, 'base'>; name: string; icon: string }[] = [
  { id: 'fairies', name: 'פיות', icon: '🧚' },
  { id: 'football', name: 'כדורגל', icon: '⚽' },
  { id: 'basketball', name: 'כדורסל', icon: '🏀' },
  { id: 'ninja', name: 'נינג׳ה', icon: '🥷' },
  { id: 'blocks', name: 'קוביות', icon: '🧱' },
  { id: 'stage', name: 'כוכבות הבמה', icon: '🎤' }
];

// Each world is a separate chunk (not in the first load).
const LOADERS: Partial<Record<WorldId, () => Promise<{ world: WorldTheme }>>> = {
  fairies: () => import('./fairies/index'),
  football: () => import('./football/index'),
  basketball: () => import('./basketball/index'),
  ninja: () => import('./ninja/index'),
  blocks: () => import('./blocks/index'),
  stage: () => import('./stage/index')
};

const cache = new Map<string, WorldTheme>([[BASE.id, BASE]]);

/** Load a world; unknown ids and failed downloads (offline before caching) fall back to the base look. */
export async function loadWorld(id: string): Promise<WorldTheme> {
  const hit = cache.get(id);
  if (hit) return hit;
  const load = LOADERS[id as WorldId];
  if (!load) return BASE;
  try {
    const { world } = await load();
    cache.set(id, world);
    return world;
  } catch (e) {
    console.warn('[world] failed to load', id, e);
    return BASE;
  }
}

/** All the worlds (for the picker and the profile tiles). */
export function loadAllWorlds(): Promise<WorldTheme[]> {
  return Promise.all(WORLD_LIST.map((w) => loadWorld(w.id)));
}

/** A world already loaded, or undefined (no waiting). */
export function cachedWorld(id: string): WorldTheme | undefined {
  return cache.get(id);
}

function declarations(vars: WorldVars): string {
  return Object.entries(vars)
    .map(([k, v]) => `--${k}:${v};`)
    .join('');
}

/** The variables as an inline style, for previews scoped to one element. */
export function worldStyle(w: WorldTheme, dark: boolean): string {
  return declarations(dark ? w.dark : w.light);
}

export function worldCss(w: WorldTheme): string {
  const sel = `:root[data-world="${w.id}"]`;
  return `${sel}{${declarations(w.light)}}@media (prefers-color-scheme: dark){${sel}{${declarations(w.dark)}}}`;
}

export function prefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

let current: WorldTheme = BASE;
let token = 0;
const listeners = new Set<() => void>();

export function currentWorld(): WorldTheme {
  return current;
}

/** Apply a world's look to the whole app. The last call wins if several are loading. */
export async function applyWorld(id: string): Promise<void> {
  const mine = ++token;
  const w = await loadWorld(id);
  if (mine !== token) return;
  const root = document.documentElement;
  let style = document.getElementById('world-vars');
  if (w.id === BASE.id) {
    delete root.dataset.world;
    style?.remove();
  } else {
    if (!style) {
      style = document.createElement('style');
      style.id = 'world-vars';
      document.head.append(style);
    }
    style.textContent = worldCss(w);
    root.dataset.world = w.id;
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', prefersDark() ? w.dark.bg : w.light.brand);
  current = w;
  // Its sounds at once; its music when its chunk arrives (unless another world came first).
  setSoundPack(w.id, w.sounds);
  if (!w.music) setMusicLoop(null, null);
  else
    void w.music().then(
      (loop) => mine === token && setMusicLoop(w.id, loop),
      () => mine === token && setMusicLoop(null, null)
    );
  listeners.forEach((f) => f());
}

/**
 * The world's boss for a chapter's boss station. Decision (phase 7): one boss per world that comes
 * back stronger every chapter (`tier` 1–5) – bolts after its name (⚡, read as nothing), its own
 * sentence for each return, a bigger picture with an aura (CSS .boss-tier-N), more hits.
 */
export function bossOf(w: WorldTheme, tier = 1): (BossDef & { tier: number }) | undefined {
  const def = w.bosses?.[0];
  if (!def) return undefined;
  if (tier <= 1) return { ...def, tier: 1 };
  return { ...def, tier, name: `${def.name} ${'⚡'.repeat(tier - 1)}`, intro: def.comebacks?.[tier - 2] ?? def.intro };
}

/** The active world; re-renders when it changes. */
export function useWorld(): WorldTheme {
  const [w, setW] = useState(current);
  useEffect(() => {
    const f = () => setW(current);
    listeners.add(f);
    f();
    return () => void listeners.delete(f);
  }, []);
  return w;
}

/** The words a world fills word problems with (core/story.ts): its vocabulary and its hero's name. */
export function storyWords(w: WorldTheme, gender: Gender | undefined): StoryWords {
  return { ...DEFAULT_WORDS, ...w.vocabulary, hero: w.hero?.name(gender) ?? DEFAULT_WORDS.hero };
}
