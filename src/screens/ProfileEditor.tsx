// Creating or editing a profile (adapted from ChessIt): name, avatar, grade or age, how to address
// the child, and the world. Choosing a world changes the whole screen's skin at once (applyWorld),
// with the world's sample sound and the hero hopping in its card. A new profile can start with
// the placement game ("where do we start?", phase 6) instead of the first station.
import { useEffect, useState } from 'preact/hooks';
import { playSfx } from '../audio/sfx';
import { WorldPicker } from '../components/WorldPicker';
import { SpeakButton } from '../components/Speak';
import { applyWorld } from '../worlds/index';
import {
  AGES,
  AVATARS,
  byGender,
  defaultSettings,
  GENDERS,
  GRADES,
  newProfileId,
  type Gender,
  type PlayWorldId,
  type Profile
} from '../profiles/profiles';
import { defaultParentSettings } from '../core/parents/prefs';

interface Props {
  /** Existing profile to edit; undefined creates a new one. */
  profile?: Profile;
  /** `placement`: play the placement game before the map (a new profile only). */
  onSave: (p: Profile, placement: boolean) => void;
  onDelete: (p: Profile) => void;
  onCancel: () => void;
  /** First run (no profiles yet): restore from a backup file instead (through the parents' door). */
  onRestore?: () => void;
}

const MAX_NAME = 16;
type StageMode = 'grade' | 'age';

export function ProfileEditor({ profile, onSave, onDelete, onCancel, onRestore }: Props) {
  const [name, setName] = useState(profile?.name ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [mode, setMode] = useState<StageMode>(profile?.age !== undefined ? 'age' : 'grade');
  const [grade, setGrade] = useState<number | undefined>(profile?.grade);
  const [age, setAge] = useState<number | undefined>(profile?.age);
  const [gender, setGender] = useState<Gender | undefined>(profile?.gender);
  const [worldId, setWorldId] = useState<PlayWorldId | null>(profile?.worldId ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [placement, setPlacement] = useState(false);

  // Live skin: the whole screen takes the world being chosen (the base look until one is picked).
  useEffect(() => {
    void applyWorld(worldId ?? 'base');
  }, [worldId]);

  const trimmed = name.trim();
  const stageSet = mode === 'grade' ? grade !== undefined : age !== undefined;
  const valid = trimmed.length > 0 && stageSet && worldId !== null;
  const missing = [!trimmed && 'שם', !stageSet && (mode === 'grade' ? 'כיתה' : 'גיל'), !worldId && 'עולם'].filter(Boolean) as string[];

  function save(e: Event) {
    e.preventDefault();
    if (!valid) return;
    const stage = mode === 'grade' ? { grade } : { age };
    const p: Profile = {
      id: profile?.id ?? newProfileId(),
      name: trimmed,
      avatar,
      ...stage,
      worldId: worldId!,
      settings: profile?.settings ?? defaultSettings(stage),
      parent: profile?.parent ?? defaultParentSettings(),
      createdAt: profile?.createdAt ?? Date.now()
    };
    if (gender) p.gender = gender;
    if (profile?.pinHash && profile.pinSalt) {
      p.pinHash = profile.pinHash;
      p.pinSalt = profile.pinSalt;
    }
    playSfx('start');
    onSave(p, !profile && placement);
  }

  const seg = (on: boolean) => `seg ${on ? 'is-on' : ''}`;
  const title = profile ? 'עריכת פרופיל' : 'פרופיל חדש';

  return (
    <main class="screen profile-editor">
      <header class="topbar">
        <button
          type="button"
          class="btn btn-ghost btn-back"
          onClick={() => {
            playSfx('tap');
            onCancel();
          }}
        >
          → חזרה
        </button>
        <h1 class="topbar-title">{title}</h1>
        <span />
      </header>

      <form class="form" onSubmit={save}>
        <div class="avatar-preview" aria-hidden="true">
          <span class="avatar avatar-xl" key={avatar}>
            {avatar}
          </span>
        </div>

        <label class="field">
          <span class="field-label">שם</span>
          <input
            class="input"
            type="text"
            name="name"
            value={name}
            maxLength={MAX_NAME}
            placeholder="איך קוראים לך?"
            autoComplete="off"
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
        </label>

        <fieldset class="field">
          <legend class="field-label">בחירת דמות</legend>
          <div class="avatar-grid">
            {AVATARS.map((a) => (
              <button
                type="button"
                key={a}
                class={`avatar-option ${a === avatar ? 'is-on' : ''}`}
                aria-pressed={a === avatar}
                aria-label={`דמות ${a}`}
                onClick={() => setAvatar(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset class="field">
          <legend class="field-label">
            {mode === 'grade' ? 'באיזו כיתה?' : 'בן או בת כמה?'}{' '}
            <span class="optional">(כדי להתחיל מהמקום הנכון)</span>
          </legend>
          <div class="segmented segmented-sm" role="group" aria-label="לפי כיתה או לפי גיל">
            <button type="button" class={seg(mode === 'grade')} aria-pressed={mode === 'grade'} data-stage-mode="grade" onClick={() => setMode('grade')}>
              לפי כיתה
            </button>
            <button type="button" class={seg(mode === 'age')} aria-pressed={mode === 'age'} data-stage-mode="age" onClick={() => setMode('age')}>
              לפי גיל
            </button>
          </div>
          {mode === 'grade' ? (
            <div class="chip-grid">
              {GRADES.map((g) => (
                <button
                  type="button"
                  key={g.grade}
                  class={`chip ${g.grade === 0 ? 'chip-wide' : ''} ${grade === g.grade ? 'is-on' : ''}`}
                  aria-pressed={grade === g.grade}
                  data-grade={g.grade}
                  onClick={() => setGrade(g.grade)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          ) : (
            <div class="chip-grid">
              {AGES.map((a) => (
                <button
                  type="button"
                  key={a}
                  class={`chip math ${age === a ? 'is-on' : ''}`}
                  aria-pressed={age === a}
                  data-age={a}
                  onClick={() => setAge(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset class="field">
          <legend class="field-label">
            איך לפנות? <span class="optional">(כדי לדבר נכון ולבחור גיבור)</span>
          </legend>
          <div class="segmented">
            {GENDERS.map((g) => (
              <button
                type="button"
                key={g.id}
                class={seg(gender === g.id)}
                aria-pressed={gender === g.id}
                data-gender={g.id}
                onClick={() => setGender(gender === g.id ? undefined : g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset class="field">
          <legend class="field-label">
            באיזה עולם {byGender({ gender }, 'תשחק', 'תשחקי', 'נשחק')}?{' '}
            <SpeakButton text={`באיזה עולם ${byGender({ gender }, 'תשחק', 'תשחקי', 'נשחק')}? פיות, כדורגל, כדורסל או נינג׳ה.`} class="speak-inline" />
            <span class="optional"> (אפשר להחליף בכל רגע)</span>
          </legend>
          <WorldPicker value={worldId} onChange={setWorldId} gender={gender} />
        </fieldset>

        {!profile && (
          <fieldset class="field">
            <legend class="field-label">
              איפה מתחילים? <span class="optional">(אפשר לבדוק שוב בהגדרות)</span>
            </legend>
            <div class="segmented">
              <button type="button" class={seg(!placement)} aria-pressed={!placement} data-start="first" onClick={() => setPlacement(false)}>
                🌱 מההתחלה
              </button>
              <button type="button" class={seg(placement)} aria-pressed={placement} data-start="placement" onClick={() => setPlacement(true)}>
                🔍 {byGender({ gender }, 'נבדוק מה אני יודע', 'נבדוק מה אני יודעת', 'נבדוק מה אנחנו יודעים')}
              </button>
            </div>
          </fieldset>
        )}

        <button class="btn btn-primary btn-big" type="submit" data-testid="save-profile" disabled={!valid}>
          {profile ? 'שמירה' : 'יצאנו לדרך!'}
        </button>
        {!valid && <p class="fineprint">חסר: {missing.join(', ')}.</p>}

        {profile &&
          (confirmDelete ? (
            <section class="card confirm">
              <p>
                למחוק את הפרופיל של {profile.name}? כל ההתקדמות {byGender(profile, 'שלו', 'שלה', 'בפרופיל')} תימחק.
              </p>
              <div class="row">
                <button type="button" class="btn btn-danger" data-testid="confirm-delete" onClick={() => onDelete(profile)}>
                  כן, למחוק
                </button>
                <button type="button" class="btn btn-secondary" onClick={() => setConfirmDelete(false)}>
                  ביטול
                </button>
              </div>
            </section>
          ) : (
            <button type="button" class="btn btn-ghost btn-danger-text" data-testid="delete-profile" onClick={() => setConfirmDelete(true)}>
              מחיקת הפרופיל
            </button>
          ))}
        {!profile && onRestore && (
          <button type="button" class="btn btn-ghost" data-testid="editor-restore" onClick={onRestore}>
            📂 יש לנו גיבוי – לשחזר ממנו
          </button>
        )}
      </form>
    </main>
  );
}
