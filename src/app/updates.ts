// A new version of the app (phase 10). The Service Worker (made by vite-plugin-pwa in the real
// build, registerType "prompt") precaches every file; a new deploy brings a new worker that installs
// in the background and then *waits*, so a child in the middle of a round is never reloaded under
// their fingers. When one is waiting, the app shows "יש גרסה חדשה" (app/App.tsx) on a calm screen;
// a tap tells the waiting worker to take over (SKIP_WAITING, a message the generated worker
// listens for) and the page reloads once it has. Ignored, it takes over the next time the app opens.
// The app also asks for updates when it comes back to the foreground and once an hour.
// In the local build there is no worker: registering fails quietly and nothing shows.

/** The parts of the browser this uses, so tests can hand in a fake (tests/app/check.ts). */
export interface UpdateEnv {
  sw: Pick<ServiceWorkerContainer, 'register' | 'controller' | 'addEventListener'> | undefined;
  url: string;
  onVisible: (f: () => void) => void;
  every: (f: () => void, ms: number) => void;
  reload: () => void;
}

type Listener = (waiting: boolean) => void;

export interface Updates {
  /** Is a new version waiting? */
  waiting: () => boolean;
  /** Called when that changes (and once at once). Returns "stop listening". */
  subscribe: (f: Listener) => () => void;
  /** Take the new version now (the page reloads when it has taken over). */
  apply: () => void;
  /** Done registering (resolves even when there is no worker). */
  ready: Promise<void>;
}

export const CHECK_EVERY_MS = 60 * 60 * 1000;

export function watchUpdates(env: UpdateEnv): Updates {
  let waitingWorker: ServiceWorker | null = null;
  let applying = false;
  let reloaded = false;
  const listeners = new Set<Listener>();
  const tell = () => listeners.forEach((f) => f(!!waitingWorker));
  const found = (w: ServiceWorker | null | undefined) => {
    // The very first install (no worker controls the page yet) is not an update.
    if (!w || !env.sw?.controller) return;
    waitingWorker = w;
    tell();
  };

  const ready = (async () => {
    if (!env.sw) return;
    env.sw.addEventListener('controllerchange', () => {
      if (applying && !reloaded) {
        reloaded = true;
        env.reload();
      }
    });
    let reg: ServiceWorkerRegistration;
    try {
      reg = await env.sw.register(env.url, { scope: './' });
    } catch {
      return; // no worker in this build, or the browser refused: nothing to update
    }
    found(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed') found(w);
      });
    });
    const check = () => void reg.update().catch(() => undefined);
    env.onVisible(check);
    env.every(check, CHECK_EVERY_MS);
  })();

  return {
    waiting: () => !!waitingWorker,
    subscribe(f) {
      listeners.add(f);
      f(!!waitingWorker);
      return () => listeners.delete(f);
    },
    apply() {
      if (!waitingWorker) return;
      applying = true;
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    },
    ready
  };
}

// Set by vite.config.ts in the real build (the one with a Service Worker); absent in the local one.
declare const __PWA__: boolean;
const HAS_WORKER = typeof __PWA__ !== 'undefined' && __PWA__;

let shared: Updates | null = null;

/** The app's own (started once, from main.tsx). */
export function appUpdates(): Updates {
  if (!shared)
    shared = watchUpdates({
      sw: HAS_WORKER && typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
      url: new URL('sw.js', document.baseURI).href,
      onVisible: (f) => document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && f()),
      every: (f, ms) => void setInterval(f, ms),
      reload: () => location.reload()
    });
  return shared;
}
