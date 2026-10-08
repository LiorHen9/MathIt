// The door to the parents' area (phase 8, adapted from ChessIt's ParentCheck): a sum an adult does
// in their head (components/ParentCheck.tsx) or, when the parents set one, their own PIN – not any
// child's. "Forgot the PIN?" falls back to the sum, and passing it removes the parents' PIN (so a
// parent notices). Loaded lazily, with the rest of the parents' area.
//
// A child must not get in by accident: nothing here reacts for a moment after the door opens, so
// the second tap of a quick double tap on "להורים" lands on nothing (and the sum's confirm button
// stays off until something is typed).
import { useEffect, useState } from 'preact/hooks';
import { playSfx } from '../audio/sfx';
import { ParentCheck } from '../components/ParentCheck';
import { PinPad } from '../components/PinPad';
import { checkParentLock, type ParentLock } from '../profiles/pin';
import { clearParentPin, getParentLock } from '../profiles/parentLock';
import './parent.css';

interface Props {
  /** Where "exit" goes ("למי משחק?", "להגדרות"). */
  exitLabel: string;
  onExit: () => void;
  onPass: () => void;
}

/** Taps are ignored this long after the door opens (a double tap's second tap). */
export const ARM_MS = 600;

export function ParentGate({ exitLabel, onExit, onPass }: Props) {
  const [lock, setLock] = useState<ParentLock | null | undefined>(undefined);
  const [forgot, setForgot] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    let alive = true;
    void getParentLock().then((l) => alive && setLock(l));
    const t = window.setTimeout(() => setArmed(true), ARM_MS);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  if (lock === undefined) return <main class="screen loading" aria-busy="true" />;
  const pin = lock && !forgot;
  return (
    <main class="screen parent-gate" data-testid="parent-gate" data-armed={armed ? 'yes' : 'no'} data-lock={lock ? 'pin' : 'sum'}>
      <header class="topbar">
        <button
          type="button"
          class="btn btn-ghost btn-back"
          data-testid="parent-exit"
          disabled={!armed}
          onClick={() => {
            playSfx('tap');
            onExit();
          }}
        >
          → {exitLabel}
        </button>
        <h1 class="topbar-title">👪 להורים</h1>
        <span />
      </header>
      <p class="settings-note parent-gate-note">כאן ההורים רואים את ההתקדמות, מכוונים הגדרות ומגבים. הכניסה רק למבוגרים.</p>
      <div class={`parent-gate-body ${armed ? '' : 'is-arming'}`} aria-busy={!armed}>
        {pin ? (
          <div class="card">
            <PinPad
              title="קוד ההורים"
              onComplete={async (typed) => {
                if (!armed) return false;
                if (!(await checkParentLock(lock, typed))) return false;
                onPass();
              }}
            />
            <button type="button" class="btn btn-ghost" data-testid="parent-forgot" onClick={() => setForgot(true)}>
              שכחתי את הקוד
            </button>
          </div>
        ) : (
          <ParentCheck
            confirmLabel="כניסה"
            onCancel={onExit}
            onPass={async () => {
              if (lock) await clearParentPin();
              onPass();
            }}
          >
            {lock ? 'פתרון נכון מסיר את קוד ההורים ונכנס.' : 'כדי להיכנס:'}
          </ParentCheck>
        )}
      </div>
    </main>
  );
}
