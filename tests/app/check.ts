// App-level checks that need no browser: `bun tests/app/check.ts`
// A new version (src/app/updates.ts) with a fake Service Worker container: nothing on the first
// install, a waiting worker is offered, "update" sends SKIP_WAITING and reloads once the new worker
// has taken over (and only then), updates are looked for when the app comes back and every hour,
// and a build without a worker (or a failed registration) offers nothing.
import { CHECK_EVERY_MS, watchUpdates, type UpdateEnv } from '../../src/app/updates';

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.log('✗', msg);
};
const ok = (msg: string) => console.log('✓', msg);
const tick = () => new Promise((r) => setTimeout(r, 0));

/** A tiny event target. */
function target() {
  const ls = new Map<string, ((e?: unknown) => void)[]>();
  return {
    addEventListener: (t: string, f: (e?: unknown) => void) => ls.set(t, [...(ls.get(t) ?? []), f]),
    fire: (t: string) => (ls.get(t) ?? []).forEach((f) => f())
  };
}

function fakeWorker() {
  const t = target();
  const w = { ...t, state: 'installing', messages: [] as unknown[], postMessage: (m: unknown) => w.messages.push(m) };
  return w;
}

function setup(opts: { controlled: boolean; waiting?: boolean; fails?: boolean }) {
  const reg = { ...target(), waiting: opts.waiting ? fakeWorker() : null, installing: null as ReturnType<typeof fakeWorker> | null, updates: 0, update: async () => void reg.updates++ };
  const sw = { ...target(), controller: opts.controlled ? {} : null, register: async () => (opts.fails ? Promise.reject(new Error('404')) : reg) };
  let visible: (() => void) | null = null;
  let hourly: [() => void, number] | null = null;
  let reloads = 0;
  const env: UpdateEnv = {
    sw: sw as never,
    url: 'https://x/sw.js',
    onVisible: (f) => (visible = f),
    every: (f, ms) => (hourly = [f, ms]),
    reload: () => reloads++
  };
  const u = watchUpdates(env);
  return { u, reg, sw, reloads: () => reloads, visible: () => visible, hourly: () => hourly };
}

{
  // The first install: the page has no worker yet – that is not an update.
  const a = setup({ controlled: false });
  await a.u.ready;
  a.reg.installing = fakeWorker();
  a.reg.fire('updatefound');
  a.reg.installing.state = 'installed';
  a.reg.installing.fire('statechange');
  if (a.u.waiting()) fail('the first install is not an update');

  // A new version installs while the app is open: it is offered, and waits.
  const b = setup({ controlled: true });
  const seen: boolean[] = [];
  b.u.subscribe((w) => seen.push(w));
  await b.u.ready;
  const w = fakeWorker();
  b.reg.installing = w;
  b.reg.fire('updatefound');
  w.state = 'installed';
  w.fire('statechange');
  if (!b.u.waiting() || seen.join() !== 'false,true') fail('a new version is offered: ' + seen);
  // A controller change that the child did not ask for (another tab) does not reload this one.
  b.sw.fire('controllerchange');
  if (b.reloads() !== 0) fail('no reload without "update"');
  b.u.apply();
  if (JSON.stringify(w.messages) !== '[{"type":"SKIP_WAITING"}]') fail('"update" sends SKIP_WAITING: ' + JSON.stringify(w.messages));
  if (b.reloads() !== 0) fail('no reload before the new worker takes over');
  b.sw.fire('controllerchange');
  b.sw.fire('controllerchange');
  if (b.reloads() !== 1) fail('reload once when it takes over: ' + b.reloads());
  // Looking for updates: back in the foreground, and every hour.
  b.visible()?.();
  b.hourly()?.[0]();
  await tick();
  if (b.reg.updates !== 2 || b.hourly()?.[1] !== CHECK_EVERY_MS) fail('updates looked for on return and hourly: ' + b.reg.updates);

  // Opened while a version already waits (installed last time): offered at once.
  const c = setup({ controlled: true, waiting: true });
  await c.u.ready;
  if (!c.u.waiting()) fail('a version already waiting is offered');

  // No worker in the build, or the registration fails: nothing to offer, no errors.
  const d = setup({ controlled: true, fails: true });
  await d.u.ready;
  d.u.apply();
  if (d.u.waiting() || d.reloads()) fail('a failed registration offers nothing');
  const e = watchUpdates({ sw: undefined, url: '', onVisible: () => {}, every: () => {}, reload: () => fail('reload without a worker') });
  await e.ready;
  if (e.waiting()) fail('no worker, nothing waiting');
  ok('new versions: the first install is quiet; a waiting version is offered; "update" → SKIP_WAITING → one reload when it takes over; looked for on return and hourly; no worker → nothing');
}

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nall app checks passed');
