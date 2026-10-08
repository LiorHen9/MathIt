// Per-profile settings (adapted from ChessIt): the world, effects, music, narration, volume,
// reduced motion, the PIN, and the placement game again (phase 6). Each change is saved at once
// and switches the real module (profiles/settings.ts). Loaded lazily (not part of the first load).
import { useState } from 'preact/hooks';
import { playSfx } from '../audio/sfx';
import { speak, useHebrewVoice } from '../audio/speech';
import { versionLabel } from '../app/version';
import { PinPad } from '../components/PinPad';
import { SpeechInstall } from '../components/Speak';
import { WorldPicker } from '../components/WorldPicker';
import { hasPin, withoutPin, withPin } from '../profiles/pin';
import { byGender, saveProfile, type PlayWorldId, type Profile } from '../profiles/profiles';
import { activeProfile, replaceActive, updateSettings, useActiveProfile } from '../profiles/settings';
import { applyWorld } from '../worlds/index';

interface Props {
  onBack: () => void;
  onEdit: () => void;
  /** The placement game again ("what do I know?"). */
  onPlacement: () => void;
}

type PinStep = 'idle' | 'new' | 'confirm' | 'saved' | 'removed';
type MotionChoice = 'phone' | 'on' | 'off';

const MOTION: { id: MotionChoice; label: string; value: boolean | null }[] = [
  { id: 'phone', label: 'לפי הטלפון', value: null },
  { id: 'on', label: 'מופחתת', value: true },
  { id: 'off', label: 'מלאה', value: false }
];

export function SettingsScreen({ onBack, onEdit, onPlacement }: Props) {
  const profile = useActiveProfile();
  const voice = useHebrewVoice();
  const [pinStep, setPinStep] = useState<PinStep>('idle');
  const [firstPin, setFirstPin] = useState('');
  const [mismatch, setMismatch] = useState(false);

  if (!profile) return <main class="screen loading" aria-busy="true" />;
  const s = profile.settings;
  const motion: MotionChoice = s.reducedMotion === null ? 'phone' : s.reducedMotion ? 'on' : 'off';

  /**
   * Change the profile from its current state (not the one this render saw) and switch to it
   * before saving: otherwise a quick second change (the volume right after a world) could be
   * overwritten when the first save finishes.
   */
  async function change(edit: (p: Profile) => Profile | Promise<Profile>) {
    const cur = activeProfile();
    if (!cur) return;
    const next = await edit(cur);
    replaceActive(next);
    await saveProfile(next);
  }

  function pickWorld(id: PlayWorldId) {
    void applyWorld(id);
    void change((p) => ({ ...p, worldId: id }));
  }

  return (
    <main class="screen settings-screen">
      <header class="topbar">
        <button
          type="button"
          class="btn btn-ghost btn-back"
          onClick={() => {
            playSfx('tap');
            onBack();
          }}
        >
          → חזרה
        </button>
        <h1 class="topbar-title">ההגדרות של {profile.name}</h1>
        <span />
      </header>

      <section class="settings-section">
        <h2 class="section-title">🌍 העולם</h2>
        <WorldPicker value={profile.worldId} onChange={pickWorld} gender={profile.gender} />
      </section>

      <section class="settings-section">
        <h2 class="section-title">🔊 צלילים והקראה</h2>
        <label class="toggle">
          <input
            type="checkbox"
            data-setting="sfx"
            checked={s.sfx}
            onChange={(e) => {
              const on = (e.target as HTMLInputElement).checked;
              void updateSettings({ sfx: on }).then(() => on && playSfx('tap'));
            }}
          />
          <span class="toggle-text">
            <span class="toggle-title">אפקטים</span>
            <span class="toggle-hint">צלילים לכל נגיעה ותשובה</span>
          </span>
        </label>
        <label class="toggle">
          <input type="checkbox" data-setting="music" checked={s.music} onChange={(e) => void updateSettings({ music: (e.target as HTMLInputElement).checked })} />
          <span class="toggle-text">
            <span class="toggle-title">מוזיקה</span>
            <span class="toggle-hint">מנגינה שקטה לכל עולם, יורדת כשמקריאים</span>
          </span>
        </label>
        <label class="toggle">
          <input
            type="checkbox"
            data-setting="narration"
            checked={s.narration}
            onChange={(e) => void updateSettings({ narration: (e.target as HTMLInputElement).checked })}
          />
          <span class="toggle-text">
            <span class="toggle-title">הקראה אוטומטית</span>
            <span class="toggle-hint">
              כל משימה חדשה מוקראת בקול. מומלץ עד גיל <bdi dir="ltr">7</bdi>. בכל מקרה אפשר ללחוץ על 🔊.
            </span>
          </span>
        </label>
        <label class="field volume">
          <span class="toggle-title">
            עוצמה <span class="math volume-value">{Math.round(s.volume * 100)}%</span>
          </span>
          <input
            type="range"
            class="range"
            data-setting="volume"
            min={0}
            max={100}
            step={10}
            value={Math.round(s.volume * 100)}
            aria-label="עוצמת הצלילים"
            onInput={(e) => void updateSettings({ volume: Number((e.target as HTMLInputElement).value) / 100 })}
            onChange={() => playSfx('tap')}
          />
        </label>
        {voice ? (
          <div class="voice-ok">
            <span>✓ יש בטלפון קול עברי</span>
            <button type="button" class="btn btn-secondary" onClick={() => speak(`שלום ${profile.name}! בואו נלמד חשבון.`)}>
              🔊 לשמוע דוגמה
            </button>
          </div>
        ) : (
          <div class="card voice-missing">
            <p class="narration-help-title">🔇 אין בטלפון קול עברי, ולכן ההקראה לא פועלת</p>
            <SpeechInstall />
          </div>
        )}
      </section>

      <section class="settings-section">
        <h2 class="section-title">🐢 תנועה</h2>
        <p class="settings-note">תנועה מופחתת מקצרת את אנימציות המשוב. ההסברים המונפשים ממשיכים לזוז, לאט, כי הם חלק מהשיעור.</p>
        <div class="segmented" role="radiogroup" aria-label="תנועה">
          {MOTION.map((m) => (
            <button
              type="button"
              key={m.id}
              role="radio"
              aria-checked={motion === m.id}
              class={`seg ${motion === m.id ? 'is-on' : ''}`}
              data-motion-choice={m.id}
              onClick={() => void updateSettings({ reducedMotion: m.value })}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">🔒 PIN לפרופיל</h2>
        <p class="settings-note">ה-PIN עוזר שאחים לא ייכנסו בטעות לפרופיל של מישהו אחר. זו לא נעילה אמיתית: הורה תמיד יכול לאפס אותו בשאלת חשבון.</p>
        {pinStep === 'new' && (
          <div class="card">
            <PinPad
              key="new"
              title={`${byGender(profile, 'בחר', 'בחרי', 'בחרו')} PIN של 4 ספרות`}
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
                await change((p) => withPin(p, pin));
                setPinStep('saved');
              }}
            />
          </div>
        )}
        {(pinStep === 'idle' || pinStep === 'saved' || pinStep === 'removed') && (
          <div class="pin-status">
            {pinStep === 'saved' && <p class="feedback is-good">✓ ה-PIN נשמר</p>}
            {pinStep === 'removed' && <p class="feedback is-good">✓ ה-PIN הוסר</p>}
            {hasPin(profile) ? (
              <div class="row">
                <button type="button" class="btn btn-secondary" data-pin="change" onClick={() => setPinStep('new')}>
                  שינוי PIN
                </button>
                <button
                  type="button"
                  class="btn btn-secondary"
                  data-pin="remove"
                  onClick={() => {
                    void change(withoutPin);
                    setPinStep('removed');
                  }}
                >
                  הסרת PIN
                </button>
              </div>
            ) : (
              <button type="button" class="btn btn-secondary" data-pin="set" onClick={() => setPinStep('new')}>
                הגדרת PIN
              </button>
            )}
          </div>
        )}
      </section>

      <section class="settings-section">
        <h2 class="section-title">👤 הפרופיל</h2>
        <button type="button" class="btn btn-secondary" data-testid="edit-profile" onClick={onEdit}>
          ✎ שם, דמות, כיתה ופנייה
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          data-testid="placement-again"
          onClick={() => {
            playSfx('tap');
            onPlacement();
          }}
        >
          🔍 {byGender(profile, 'לבדוק שוב מה אני יודע', 'לבדוק שוב מה אני יודעת', 'לבדוק שוב מה אנחנו יודעים')}
        </button>
      </section>

      <p class="version fineprint">
        גרסה <span class="math">{versionLabel()}</span>
      </p>
    </main>
  );
}
