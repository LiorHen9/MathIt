// The whole app is a small state machine: one screen at a time, no router (as in ChessIt).
// Phase 0: loading → splash → next (a placeholder for phase 1's "who is playing?").
import { useEffect, useState } from 'preact/hooks';
import { deviceId, requestPersistence } from '../storage/db';
import { applyWorld } from '../worlds/index';
import { stopSpeaking } from '../audio/speech';
import { Splash } from '../screens/Splash';
import { lazy } from './lazy';
import { logError } from './errorLog';

// Not needed for the first screen: a separate chunk (see lazy.tsx).
const ComingSoon = lazy(() => import('../screens/ComingSoon').then((m) => m.ComingSoon));

type Screen = { name: 'loading' } | { name: 'splash' } | { name: 'next' };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'loading' });

  useEffect(() => {
    (async () => {
      try {
        await applyWorld('base');
        await deviceId();
      } catch (e) {
        logError(e, 'start');
      }
      setScreen({ name: 'splash' });
      void requestPersistence();
    })();
  }, []);

  // Moving to another screen stops anything still being read aloud.
  useEffect(() => stopSpeaking, [screen.name]);

  switch (screen.name) {
    case 'loading':
      return <main class="screen loading" aria-busy="true" />;
    case 'splash':
      return <Splash onStart={() => setScreen({ name: 'next' })} />;
    case 'next':
      return <ComingSoon onBack={() => setScreen({ name: 'splash' })} />;
  }
}
