// The parents' area (phase 8), its first page after the door (screens/ParentGate.tsx): every child
// on this phone – tap one for their dashboard and settings – the parents' own PIN, and backup and
// restore (BackupPanel). Loaded lazily; the look is the neutral base one (not any child's world).
import { useEffect, useState } from 'preact/hooks';
import { playSfx } from '../audio/sfx';
import { PinPad } from '../components/PinPad';
import { stageLabel, type Profile } from '../profiles/profiles';
import { clearParentPin, getParentLock, setParentPin } from '../profiles/parentLock';
import type { ParentLock } from '../profiles/pin';
import { WORLD_LIST } from '../worlds/index';
import { BackupPanel } from './BackupPanel';
import './parent.css';

interface Props {
  profiles: Profile[];
  exitLabel: string;
  onExit: () => void;
  onChild?: (p: Profile) => void;
  /** A backup was restored: the family on this phone changed. */
  onRestored?: () => void;
  /** About and privacy (phase 10). */
  onAbout?: () => void;
}

type PinStep = 'idle' | 'new' | 'confirm' | 'saved' | 'removed';

export function ParentHome({ profiles, exitLabel, onExit, onChild, onRestored, onAbout }: Props) {
  const [lock, setLock] = useState<ParentLock | null | undefined>(undefined);
  const [pinStep, setPinStep] = useState<PinStep>('idle');
  const [firstPin, setFirstPin] = useState('');
  const [mismatch, setMismatch] = useState(false);

  useEffect(() => {
    void getParentLock().then(setLock);
  }, []);

  return (
    <main class="screen parent-area parent-home" data-testid="parent-home">
      <header class="topbar">
        <button
          type="button"
          class="btn btn-ghost btn-back"
          data-testid="parent-exit"
          onClick={() => {
            playSfx('tap');
            onExit();
          }}
        >
          → {exitLabel}
        </button>
        <h1 class="topbar-title">👪 אזור ההורים</h1>
        <span />
      </header>

      <section class="settings-section">
        <h2 class="section-title">הילדים</h2>
        {profiles.length === 0 ? (
          <p class="settings-note">אין עדיין פרופילים בטלפון הזה.</p>
        ) : (
          <ul class="parent-kids">
            {profiles.map((p) => {
              const w = WORLD_LIST.find((x) => x.id === p.worldId);
              const body = (
                <>
                  <span class="avatar avatar-md" aria-hidden="true">
                    {p.avatar}
                  </span>
                  <span class="parent-kid-text">
                    <span class="parent-kid-name">{p.name}</span>
                    <span class="parent-kid-sub">
                      {stageLabel(p)}
                      {w && (
                        <>
                          {' '}
                          · {w.icon} {w.name}
                        </>
                      )}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={p.id}>
                  {onChild ? (
                    <button
                      type="button"
                      class="parent-kid"
                      data-kid={p.id}
                      onClick={() => {
                        playSfx('tap');
                        onChild(p);
                      }}
                    >
                      {body}
                      <span class="parent-kid-go" aria-hidden="true">
                        ‹
                      </span>
                    </button>
                  ) : (
                    <div class="parent-kid" data-kid={p.id}>
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section class="settings-section">
        <h2 class="section-title">🔒 קוד הורים</h2>
        <p class="settings-note">
          בלי קוד, הכניסה לכאן היא בתרגיל כפל למבוגרים. קוד של 4 ספרות, נפרד מה-PIN של הילדים, נועל טוב יותר. שכחתם? התרגיל מסיר אותו.
        </p>
        {pinStep === 'new' && (
          <div class="card">
            <PinPad
              key="new"
              title="קוד הורים חדש, 4 ספרות"
              onComplete={(pin) => {
                setFirstPin(pin);
                setMismatch(false);
                setPinStep('confirm');
              }}
            />
          </div>
        )}
        {pinStep === 'confirm' && (
          <div class="card">
            <PinPad
              key="confirm"
              title="עוד פעם, לאישור"
              hint={mismatch ? 'לא תאם. נסו שוב.' : undefined}
              onComplete={async (pin) => {
                if (pin !== firstPin) {
                  setMismatch(true);
                  return false;
                }
                setLock(await setParentPin(pin));
                setPinStep('saved');
              }}
            />
          </div>
        )}
        {pinStep !== 'new' && pinStep !== 'confirm' && lock !== undefined && (
          <div class="pin-status">
            {pinStep === 'saved' && <p class="feedback is-good">✓ קוד ההורים נשמר</p>}
            {pinStep === 'removed' && <p class="feedback is-good">✓ קוד ההורים הוסר</p>}
            {lock ? (
              <div class="row">
                <button type="button" class="btn btn-secondary" data-parent-pin="change" onClick={() => setPinStep('new')}>
                  שינוי הקוד
                </button>
                <button
                  type="button"
                  class="btn btn-secondary"
                  data-parent-pin="remove"
                  onClick={() => {
                    void clearParentPin().then(() => {
                      setLock(null);
                      setPinStep('removed');
                    });
                  }}
                >
                  הסרת הקוד
                </button>
              </div>
            ) : (
              <button type="button" class="btn btn-secondary" data-parent-pin="set" onClick={() => setPinStep('new')}>
                הגדרת קוד הורים
              </button>
            )}
          </div>
        )}
      </section>

      <BackupPanel profiles={profiles} onRestored={() => onRestored?.()} />

      {onAbout && (
        <button type="button" class="btn btn-ghost" data-testid="open-about" onClick={onAbout}>
          ℹ️ אודות ופרטיות
        </button>
      )}
    </main>
  );
}
