// World registry and switching (adapted from ChessIt's themes). Only the base look is in the main
// bundle; every world is its own small chunk, loaded when a profile that uses it becomes active
// (or when the picker shows previews). Switching = new CSS variables on <html>, no reload.
import { useEffect, useState } from 'preact/hooks';
import { BASE } from './base';
import type { WorldId, WorldTheme, WorldVars } from './types';

export type { WorldId, WorldTheme } from './types';
export { BASE } from './base';

/**
 * Shown in the picker before the world itself is loaded. Order = picker order.
 * Phase 1 adds fairies, football, basketball and ninja here and in LOADERS.
 */
export const WORLD_LIST: { id: WorldId; name: string; icon: string }[] = [];

const LOADERS: Partial<Record<WorldId, () => Promise<{ world: WorldTheme }>>> = {};

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
  listeners.forEach((f) => f());
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
