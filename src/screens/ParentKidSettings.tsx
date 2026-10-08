// A parent's settings for one child (phase 8), on the child's dashboard: reading aloud, sounds,
// music, volume and motion (the child's own settings), the daily goal, a gentle break, the games
// a round may use, free practice kept to the journey, and chapters opened by hand.
// Every change is saved at once (the profile; an opened chapter goes to the map's progress).
import { useState } from 'preact/hooks';
import { playSfx } from '../audio/sfx';
import type { Profile, ProfileSettings } from '../profiles/profiles';
import { BREAK_CHOICES, GOAL_CHOICES, TEMPLATE_NAMES, goalText, type ChapterLine, type DailyGoal, type ParentSettings } from '../core/parents/index';
import type { TemplateId } from '../core/types';

interface Props {
  profile: Profile;
  chapters: ChapterLine[];
  /** Chapters a parent opened by hand. */
  opened: string[];
  onSave: (p: Profile) => void;
  onChapter: (chapterId: string, open: boolean) => void;
}

const MOTION: { id: string; label: string; value: boolean | null }[] = [
  { id: 'phone', label: 'לפי הטלפון', value: null },
  { id: 'on', label: 'מופחתת', value: true },
  { id: 'off', label: 'מלאה', value: false }
];

const sameGoal = (a: DailyGoal | null, b: DailyGoal | null) => (a === null ? b === null : !!b && a.kind === b.kind && a.amount === b.amount);

export function ParentKidSettings({ profile: given, chapters, opened, onSave, onChapter }: Props) {
  // A copy of its own, so quick changes build on each other (not on a record still being saved).
  const [profile, setProfile] = useState(given);
  const s = profile.settings;
  const par = profile.parent;
  const save = (p: Profile) => {
    setProfile(p);
    onSave(p);
  };
  const set = (patch: Partial<ProfileSettings>) => save({ ...profile, settings: { ...s, ...patch } });
  const setPar = (patch: Partial<ParentSettings>) => {
    playSfx('tap');
    save({ ...profile, parent: { ...par, ...patch } });
  };
  const motion = MOTION.find((m) => m.value === s.reducedMotion)?.id ?? 'phone';
  const goals: (DailyGoal | null)[] = [null, ...GOAL_CHOICES.questions.map((amount) => ({ kind: 'questions' as const, amount })), ...GOAL_CHOICES.minutes.map((amount) => ({ kind: 'minutes' as const, amount }))];
  const ahead = chapters.filter((c) => !c.reached || opened.includes(c.id));

  return (
    <section class="settings-section" data-testid="dash-settings">
      <h2 class="section-title">⚙️ הגדרות ל{profile.name}</h2>

      <div class="card dash-card">
        <h3 class="dash-ch-title">🔊 קול ותנועה</h3>
        <label class="toggle">
          <input type="checkbox" data-kid-setting="narration" checked={s.narration} onChange={(e) => set({ narration: (e.target as HTMLInputElement).checked })} />
          <span class="toggle-text">
            <span class="toggle-title">הקראה אוטומטית</span>
            <span class="toggle-hint">מומלץ עד גיל 7, לילדים שעוד לא קוראים</span>
          </span>
        </label>
        <label class="toggle">
          <input type="checkbox" data-kid-setting="sfx" checked={s.sfx} onChange={(e) => set({ sfx: (e.target as HTMLInputElement).checked })} />
          <span class="toggle-text">
            <span class="toggle-title">צלילי משוב</span>
          </span>
        </label>
        <label class="toggle">
          <input type="checkbox" data-kid-setting="music" checked={s.music} onChange={(e) => set({ music: (e.target as HTMLInputElement).checked })} />
          <span class="toggle-text">
            <span class="toggle-title">מוזיקה</span>
          </span>
        </label>
        <label class="field volume">
          <span class="toggle-title">
            עוצמה <span class="math volume-value">{Math.round(s.volume * 100)}%</span>
          </span>
          <input
            type="range"
            class="range"
            data-kid-setting="volume"
            min={0}
            max={100}
            step={10}
            value={Math.round(s.volume * 100)}
            aria-label="עוצמת הצלילים"
            onChange={(e) => set({ volume: Number((e.target as HTMLInputElement).value) / 100 })}
          />
        </label>
        <div class="segmented segmented-sm" role="radiogroup" aria-label="תנועה">
          {MOTION.map((m) => (
            <button type="button" key={m.id} role="radio" aria-checked={motion === m.id} class={`seg ${motion === m.id ? 'is-on' : ''}`} data-kid-motion={m.id} onClick={() => set({ reducedMotion: m.value })}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div class="card dash-card">
        <h3 class="dash-ch-title">🎯 יעד יומי</h3>
        <p class="settings-note">הילד רואה את היעד במפה, ויש חגיגה קטנה כשמגיעים אליו.</p>
        <div class="chip-grid" role="radiogroup" aria-label="יעד יומי">
          {goals.map((g) => {
            const on = sameGoal(g, par.goal);
            return (
              <button type="button" key={g ? `${g.kind}:${g.amount}` : 'none'} role="radio" aria-checked={on} class={`chip dash-chip ${on ? 'is-on' : ''}`} data-goal={g ? `${g.kind}:${g.amount}` : 'none'} onClick={() => setPar({ goal: g })}>
                {g ? goalText(g) : 'בלי'}
              </button>
            );
          })}
        </div>
      </div>

      <div class="card dash-card">
        <h3 class="dash-ch-title">🧃 הפסקה</h3>
        <p class="settings-note">אחרי זמן המשחק שבוחרים, המפה מציעה בעדינות הפסקה קטנה.</p>
        <div class="chip-grid" role="radiogroup" aria-label="הפסקה אחרי">
          {[null, ...BREAK_CHOICES].map((m) => {
            const on = par.breakAfter === m;
            return (
              <button type="button" key={m ?? 'none'} role="radio" aria-checked={on} class={`chip dash-chip ${on ? 'is-on' : ''}`} data-break={m ?? 'none'} onClick={() => setPar({ breakAfter: m })}>
                {m ? `${m} דק׳` : 'בלי'}
              </button>
            );
          })}
        </div>
      </div>

      <div class="card dash-card">
        <h3 class="dash-ch-title">🎮 משחקים</h3>
        <p class="settings-note">משחק כבוי מתחלף בבועות (המשחק הבסיסי).</p>
        {(Object.keys(TEMPLATE_NAMES) as Exclude<TemplateId, 'pop'>[]).map((t) => (
          <label class="toggle" key={t}>
            <input
              type="checkbox"
              data-template-toggle={t}
              checked={!par.blocked.includes(t)}
              onChange={(e) => {
                const on = (e.target as HTMLInputElement).checked;
                setPar({ blocked: on ? par.blocked.filter((x) => x !== t) : [...par.blocked, t] });
              }}
            />
            <span class="toggle-text">
              <span class="toggle-title">{TEMPLATE_NAMES[t]}</span>
            </span>
          </label>
        ))}
      </div>

      <div class="card dash-card">
        <h3 class="dash-ch-title">🗺️ פרקים</h3>
        <label class="toggle">
          <input type="checkbox" data-kid-setting="lockAhead" checked={par.lockAhead} onChange={(e) => setPar({ lockAhead: (e.target as HTMLInputElement).checked })} />
          <span class="toggle-text">
            <span class="toggle-title">תרגול חופשי רק במה שנפתח במסע</span>
            <span class="toggle-hint">נושאים של פרקים קדימה יחכו עד שיגיעו אליהם</span>
          </span>
        </label>
        {ahead.length > 0 && <p class="settings-note">אפשר לפתוח פרק קדימה ביד, למשל לילד שכבר יודע:</p>}
        {ahead.map((c) => {
          const on = opened.includes(c.id);
          return (
            <button
              type="button"
              key={c.id}
              class={`btn btn-secondary dash-open ${on ? 'is-on' : ''}`}
              aria-pressed={on}
              data-open-chapter={c.id}
              onClick={() => {
                playSfx('tap');
                onChapter(c.id, !on);
              }}
            >
              {on ? '✓ ' : '🔒 '}
              {c.title}
            </button>
          );
        })}
      </div>
    </section>
  );
}
