// Screens that are not needed right away are separate chunks, loaded on first use, so the first
// load stays small. The Service Worker still precaches every chunk, so they work offline.
//
// Phase 10: a lazy screen can be loaded ahead (`preload`), so App keeps the old screen up while the
// next one's chunk arrives and then moves in one step (app/App.tsx `go`) – no blank flash. If a
// chunk is slow (an old phone, the first visit), App moves on after a short wait and the
// placeholder below shows: a quiet outline of a screen that fades in only after a moment.
import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { logError } from './errorLog';

export type LazyScreen<P extends object> = ComponentType<P> & {
  /** Start loading (once); resolves when the screen can be drawn. */
  preload: () => Promise<void>;
  /** Already loaded? */
  loaded: () => boolean;
};

/** What shows while a screen's chunk is on its way: a faint topbar and two cards, fading in late. */
export function ScreenPlaceholder() {
  return (
    <main class="screen loading" aria-busy="true" aria-label="טוענים…">
      <div class="ph" aria-hidden="true">
        <span class="ph-bar" />
        <span class="ph-card" />
        <span class="ph-card is-short" />
      </div>
    </main>
  );
}

export function lazy<P extends object>(load: () => Promise<ComponentType<P>>): LazyScreen<P> {
  let Loaded: ComponentType<P> | null = null;
  let pending: Promise<void> | null = null;
  const start = () => {
    if (!pending)
      pending = load().then(
        (c) => {
          Loaded = c;
        },
        (e) => {
          pending = null;
          throw e;
        }
      );
    return pending;
  };

  function Lazy(props: P) {
    const [, setReady] = useState(!!Loaded);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
      if (Loaded) return;
      let alive = true;
      start().then(
        () => alive && setReady(true),
        (e) => {
          console.error('[lazy] failed to load a screen', e);
          logError(e, 'lazy screen');
          if (alive) setFailed(true);
        }
      );
      return () => {
        alive = false;
      };
    }, []);
    if (Loaded) return <Loaded {...props} />;
    if (failed)
      return (
        <main class="screen">
          <p>לא הצלחנו לטעון את המסך. צריך חיבור לאינטרנט בפעם הראשונה.</p>
          <button class="btn btn-primary" onClick={() => location.reload()}>
            לנסות שוב
          </button>
        </main>
      );
    return <ScreenPlaceholder />;
  }
  return Object.assign(Lazy, { preload: () => start().catch(() => undefined), loaded: () => !!Loaded });
}
