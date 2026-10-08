// Backup and restore in the parents' area (phase 8; storage/backup.ts): save the whole family to a
// file (download, or the phone's share sheet when it can share files), and restore from one –
// check it, show who is in it, ask whether to add to this phone or replace everything on it (and,
// when adding, what to do with a child who is on both), then write it all at once.
// "Last backup" is kept in meta; after 14 days without one, a gentle reminder.
import { useEffect, useState } from 'preact/hooks';
import { playSfx } from '../audio/sfx';
import { now as clockNow } from '../app/clock';
import type { Profile } from '../profiles/profiles';
import { backupFileName, backupJson, conflictsWith, errorText, makeBackup, parseBackup, profileSummary, restoreBackup, type Backup, type Conflict } from '../storage/backup';
import { backupDue, loadBackupState, markBackedUp, type BackupState } from '../storage/backupState';

interface Props {
  profiles: Profile[];
  /** The family on this phone changed: read it again. */
  onRestored: () => void;
}

type Step = { kind: 'idle' } | { kind: 'error'; text: string } | { kind: 'preview'; backup: Backup } | { kind: 'done'; count: number };

const dateText = (ms: number) => new Date(ms).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });

export function BackupPanel({ profiles, onRestored }: Props) {
  const [state, setState] = useState<BackupState | null>(null);
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [mode, setMode] = useState<'add' | 'replace'>('add');
  const [choices, setChoices] = useState<Record<string, Conflict>>({});
  const [busy, setBusy] = useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && (() => {
    try {
      return navigator.canShare({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] });
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    void loadBackupState().then(setState);
  }, []);

  async function file(): Promise<File> {
    const b = await makeBackup();
    return new File([backupJson(b)], backupFileName(), { type: 'application/json' });
  }

  async function done() {
    const at = Date.now();
    await markBackedUp(at);
    setState({ lastBackupAt: at });
    setSaved(true);
  }

  async function download() {
    playSfx('tap');
    const f = await file();
    const url = URL.createObjectURL(f);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    await done();
  }

  async function share() {
    playSfx('tap');
    const f = await file();
    try {
      await navigator.share({ files: [f], title: 'גיבוי MathIt' });
      await done();
    } catch {
      // Cancelled: nothing saved.
    }
  }

  async function pick(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    const r = parseBackup(await f.text());
    if (!r.ok) {
      setStep({ kind: 'error', text: errorText(r.error) });
      return;
    }
    setMode(profiles.length ? 'add' : 'replace');
    setChoices({});
    setStep({ kind: 'preview', backup: r.backup });
  }

  async function restore(b: Backup) {
    setBusy(true);
    try {
      const written = await restoreBackup(b, { mode, conflicts: choices });
      playSfx('start');
      setStep({ kind: 'done', count: written.length });
      onRestored();
    } catch {
      setStep({ kind: 'error', text: 'השחזור לא הצליח, ושום דבר בטלפון לא השתנה. אפשר לנסות שוב.' });
    } finally {
      setBusy(false);
    }
  }

  const due = state && backupDue(state, profiles.map((p) => p.createdAt), clockNow());

  return (
    <section class="settings-section" data-testid="backup">
      <h2 class="section-title">💾 גיבוי</h2>
      <p class="settings-note">
        כל הנתונים נשמרים רק בטלפון הזה. קובץ גיבוי שומר את כל הילדים – המסע, האוסף, המטבעות, ההתקדמות וההגדרות – ומאפשר להעביר אותם לטלפון אחר.
      </p>
      {state && (
        <p class="settings-note" data-testid="backup-last">
          {state.lastBackupAt ? `גיבוי אחרון: ${dateText(state.lastBackupAt)}` : 'עוד לא נשמר גיבוי מהטלפון הזה.'}
        </p>
      )}
      {due && !saved && (
        <p class="card backup-remind" data-testid="backup-remind">
          💡 עברו יותר משבועיים בלי גיבוי. כדאי לשמור קובץ, למקרה שהטלפון יתחלף.
        </p>
      )}
      {profiles.length > 0 && (
        <div class="row">
          <button type="button" class="btn btn-secondary" data-backup="save" onClick={() => void download()}>
            ⬇️ שמירת קובץ גיבוי
          </button>
          {canShare && (
            <button type="button" class="btn btn-secondary" data-backup="share" onClick={() => void share()}>
              📤 שיתוף
            </button>
          )}
        </div>
      )}
      {saved && <p class="feedback is-good">✓ הגיבוי נשמר</p>}

      <label class="btn btn-secondary backup-file">
        📂 שחזור מקובץ גיבוי
        <input type="file" accept=".json,application/json" data-backup="file" class="visually-hidden" onChange={(e) => void pick(e)} />
      </label>

      {step.kind === 'error' && (
        <p class="feedback is-bad" role="alert" data-testid="backup-error">
          {step.text}
        </p>
      )}
      {step.kind === 'done' && (
        <p class="feedback is-good" role="status" data-testid="backup-done">
          ✓ שוחזרו {step.count === 1 ? 'ילד אחד' : `${step.count} ילדים`}
        </p>
      )}
      {step.kind === 'preview' && (
        <Preview
          backup={step.backup}
          profiles={profiles}
          mode={mode}
          choices={choices}
          busy={busy}
          onMode={setMode}
          onChoice={(id, c) => setChoices({ ...choices, [id]: c })}
          onCancel={() => setStep({ kind: 'idle' })}
          onGo={() => void restore(step.backup)}
        />
      )}
    </section>
  );
}

function Preview(props: {
  backup: Backup;
  profiles: Profile[];
  mode: 'add' | 'replace';
  choices: Record<string, Conflict>;
  busy: boolean;
  onMode: (m: 'add' | 'replace') => void;
  onChoice: (id: string, c: Conflict) => void;
  onCancel: () => void;
  onGo: () => void;
}) {
  const { backup, profiles, mode, choices, busy } = props;
  const both = new Set(conflictsWith(backup, profiles).map((p) => p.id));
  return (
    <div class="card dash-card" data-testid="backup-preview">
      <p class="dash-big">גיבוי מ-{dateText(Date.parse(backup.exportedAt))}</p>
      <ul class="parent-kids">
        {backup.profiles.map((p) => {
          const s = profileSummary(backup, p.id);
          return (
            <li key={p.id} class="parent-kid" data-backup-kid={p.id}>
              <span class="avatar avatar-md" aria-hidden="true">
                {p.avatar}
              </span>
              <span class="parent-kid-text">
                <span class="parent-kid-name">{p.name}</span>
                <span class="parent-kid-sub">
                  ⭐ {s.stars} · 🪙 {s.coins} · {s.questions} שאלות
                </span>
                {mode === 'add' && both.has(p.id) && (
                  <span class="segmented segmented-sm backup-choice" role="radiogroup" aria-label={`${p.name} כבר בטלפון`}>
                    {(['keep', 'replace'] as const).map((c) => {
                      const on = (choices[p.id] ?? 'keep') === c;
                      return (
                        <button type="button" key={c} role="radio" aria-checked={on} class={`seg ${on ? 'is-on' : ''}`} data-conflict={`${p.id}:${c}`} onClick={() => props.onChoice(p.id, c)}>
                          {c === 'keep' ? 'להשאיר את שבטלפון' : 'לקחת מהגיבוי'}
                        </button>
                      );
                    })}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {profiles.length > 0 && (
        <div class="segmented segmented-sm" role="radiogroup" aria-label="איך לשחזר">
          <button type="button" role="radio" aria-checked={mode === 'add'} class={`seg ${mode === 'add' ? 'is-on' : ''}`} data-restore-mode="add" onClick={() => props.onMode('add')}>
            ➕ להוסיף לטלפון
          </button>
          <button type="button" role="radio" aria-checked={mode === 'replace'} class={`seg ${mode === 'replace' ? 'is-on' : ''}`} data-restore-mode="replace" onClick={() => props.onMode('replace')}>
            ♻️ להחליף הכול
          </button>
        </div>
      )}
      {profiles.length > 0 && mode === 'replace' && <p class="feedback is-bad">כל מה שבטלפון עכשיו יימחק ויוחלף בגיבוי.</p>}
      <div class="row">
        <button type="button" class="btn btn-primary" data-restore="go" disabled={busy} onClick={props.onGo}>
          שחזור
        </button>
        <button type="button" class="btn btn-secondary" data-restore="cancel" onClick={props.onCancel}>
          ביטול
        </button>
      </div>
    </div>
  );
}
