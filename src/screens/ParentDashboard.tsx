// One child's dashboard in the parents' area (phase 8), loaded lazily: where they are on the
// journey, what is mastered / being learned / not yet (by chapter), where it is hard (the common
// mistakes in parents' words, with "practise this" and the lesson), and practice time – today,
// this week (simple SVG bars), all time – with reviews due and the placement date; and the
// parents' settings for this child (ParentKidSettings).
// The numbers come from core/parents (pure) over the stores; the look is the neutral base one.
import { useEffect, useState } from 'preact/hooks';
import { playSfx } from '../audio/sfx';
import { now as clockNow } from '../app/clock';
import { byGender, type Profile } from '../profiles/profiles';
import { dueSkills, summarize, type ProfileSummary } from '../core/mastery/index';
import { PARENT_ERRORS, durationText, journeyView, skillsByChapter, statusCounts, timeStats, weekdayLabel, type ChapterSkills, type JourneyView, type SkillStatus, type TimeStats } from '../core/parents/index';
import { getSkill } from '../core/skills/index';
import type { ErrorTag, SkillId } from '../core/types';
import { listSkillStates } from '../storage/skillStates';
import { getQuestRecord, setChapterOpen } from '../storage/questProgress';
import { ParentKidSettings } from './ParentKidSettings';
import { listDayLogs } from '../storage/sessions';
import { WORLD_LIST } from '../worlds/index';
import './parent.css';

interface Props {
  profile: Profile;
  onBack: () => void;
  /** "Practise this": a round of the skill aimed at the mistake, in the child's world. */
  onPractice: (skillId: SkillId, focus: ErrorTag) => void;
  onLesson: (skillId: SkillId) => void;
  /** A setting changed: save the profile. */
  onSave: (p: Profile) => void;
}

interface Data {
  journey: JourneyView;
  chapters: ChapterSkills[];
  summary: ProfileSummary;
  time: TimeStats;
  due: SkillId[];
  placedAt: number;
  opened: string[];
}

const STATUS: Record<SkillStatus, string> = { mastered: 'נשלט', learning: 'בלמידה', new: 'עוד לא' };

const dateText = (ms: number) => new Date(ms).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });

export function ParentDashboard({ profile, onBack, onPractice, onLesson, onSave }: Props) {
  const [data, setData] = useState<Data | null>(null);
  const [loads, setLoads] = useState(0);
  const world = WORLD_LIST.find((w) => w.id === profile.worldId);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const now = clockNow();
      const [states, quest, days] = await Promise.all([listSkillStates(profile.id), getQuestRecord(profile.id), listDayLogs(profile.id)]);
      if (!alive) return;
      setData({
        journey: journeyView(quest),
        chapters: skillsByChapter(states),
        summary: summarize(states, now),
        time: timeStats(days, profile.id, now),
        due: dueSkills(states, now),
        placedAt: quest.placedAt,
        opened: quest.opened
      });
    })();
    return () => {
      alive = false;
    };
  }, [profile.id, loads]);

  return (
    <main class="screen parent-area parent-dash" data-testid="parent-dash" data-kid={profile.id}>
      <header class="topbar">
        <button
          type="button"
          class="btn btn-ghost btn-back"
          data-testid="parent-dash-back"
          onClick={() => {
            playSfx('tap');
            onBack();
          }}
        >
          → כל הילדים
        </button>
        <h1 class="topbar-title">
          <span aria-hidden="true">{profile.avatar}</span> {profile.name}
        </h1>
        <span />
      </header>
      {!data ? (
        <p class="settings-note" aria-busy="true">
          טוען…
        </p>
      ) : (
        <>
          <Dashboard profile={profile} worldName={world ? `${world.icon} ${world.name}` : ''} data={data} onPractice={onPractice} onLesson={onLesson} />
          <ParentKidSettings
            profile={profile}
            chapters={data.journey.chapters}
            opened={data.opened}
            onSave={onSave}
            onChapter={(id, open) => void setChapterOpen(profile.id, id, open).then(() => setLoads((n) => n + 1))}
          />
        </>
      )}
    </main>
  );
}

function Dashboard({ profile, worldName, data, onPractice, onLesson }: { profile: Profile; worldName: string; data: Data } & Pick<Props, 'onPractice' | 'onLesson'>) {
  const { journey, chapters, summary, time, due, placedAt } = data;
  const counts = statusCounts(chapters);
  const g = (m: string, f: string) => byGender(profile, m, f, m);
  return (
    <>
      <section class="settings-section" data-testid="dash-journey">
        <h2 class="section-title">🗺️ המסע</h2>
        <div class="card dash-card">
          {journey.chapter ? (
            <p class="dash-big">{journey.chapter.title}</p>
          ) : (
            <p class="dash-big">{g('סיים', 'סיימה')} את כל המסע 🎉</p>
          )}
          {journey.station && <p class="settings-note">התחנה הבאה: {journey.station}</p>}
          <p class="settings-note">
            {worldName && <>עולם: {worldName} · </>}בוסים שנוצחו: {journey.bossesBeaten}
            {journey.puzzles.total > 0 && (
              <span data-testid="dash-puzzles" data-solved={journey.puzzles.solved}>
                {' '}
                · 🧩 חידות שנפתרו: {journey.puzzles.solved} מתוך {journey.puzzles.total}
              </span>
            )}
          </p>
          <ul class="dash-chapters">
            {journey.chapters.map((c) => (
              <li key={c.id} class={c.reached ? '' : 'is-ahead'} data-chapter={c.id}>
                <span class="dash-ch-name">
                  {c.title}
                  {c.bossBeaten && <span aria-label="הבוס נוצח"> 👑</span>}
                </span>
                <Meter value={c.maxStars ? c.stars / c.maxStars : 0} label={`${c.stars} מתוך ${c.maxStars} כוכבים`} />
                <span class="dash-ch-stars">
                  ⭐ {c.stars}/{c.maxStars}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section class="settings-section" data-testid="dash-time">
        <h2 class="section-title">⏱️ זמן תרגול</h2>
        <div class="card dash-card">
          <div class="dash-stats">
            <Stat label="היום" value={durationText(time.today.ms)} sub={`${time.today.questions} שאלות`} test="today" />
            <Stat label="השבוע" value={durationText(time.weekMs)} sub={time.weekDays === 1 ? 'יום אחד מתוך 7' : `${time.weekDays} ימים מתוך 7`} test="week" />
            <Stat label="סך הכול" value={durationText(summary.practiceMs)} sub={`${summary.attempts} שאלות`} test="all" />
          </div>
          <WeekBars time={time} />
          {summary.lastPracticed > 0 && <p class="settings-note">תרגול אחרון: {dateText(summary.lastPracticed)}</p>}
          <p class="settings-note" data-testid="dash-placed">
            {placedAt ? `מבחן מיקום: ${dateText(placedAt)}` : 'מבחן מיקום: עוד לא'}
          </p>
        </div>
      </section>

      <section class="settings-section" data-testid="dash-hard">
        <h2 class="section-title">🧩 איפה קשה</h2>
        {summary.hard.length === 0 ? (
          <p class="settings-note">אין עדיין טעות שחוזרת על עצמה. 👍</p>
        ) : (
          <ul class="dash-hard">
            {summary.hard.slice(0, 5).map((h) => {
              const sk = getSkill(h.skillId);
              const e = PARENT_ERRORS[h.tag];
              return (
                <li key={h.skillId} class="card dash-card" data-hard={h.skillId} data-tag={h.tag}>
                  <p class="dash-hard-skill">
                    <span aria-hidden="true">{sk?.icon}</span> {sk?.title ?? h.skillId}
                  </p>
                  <p class="dash-hard-what">
                    {g(e.m, e.f)} <span class="dash-count">({h.count} פעמים)</span>
                  </p>
                  <p class="settings-note">💡 {e.tip}</p>
                  <div class="row">
                    <button
                      type="button"
                      class="btn btn-secondary"
                      data-practice={h.skillId}
                      onClick={() => {
                        playSfx('tap');
                        onPractice(h.skillId, h.tag);
                      }}
                    >
                      ▶ לתרגל את זה
                    </button>
                    <button
                      type="button"
                      class="btn btn-secondary"
                      data-lesson={h.skillId}
                      onClick={() => {
                        playSfx('tap');
                        onLesson(h.skillId);
                      }}
                    >
                      📖 שיעור
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section class="settings-section" data-testid="dash-skills">
        <h2 class="section-title">📚 מה נשלט</h2>
        <p class="settings-note" data-testid="dash-counts">
          {counts.mastered} נשלטו · {counts.learning} בלמידה · {counts.new} עוד לא
        </p>
        {due.length > 0 && (
          <p class="settings-note" data-testid="dash-due">
            🔁 הגיע זמן לחזור על: {due.map((id) => getSkill(id)?.title ?? id).join(', ')}
          </p>
        )}
        {chapters.map((c) => (
          <div key={c.id} class="card dash-card">
            <h3 class="dash-ch-title">{c.title}</h3>
            <ul class="dash-skills">
              {c.skills.map((s) => (
                <li key={s.skillId} data-skill={s.skillId} data-status={s.status}>
                  <span class="dash-skill-name">
                    <span aria-hidden="true">{s.icon}</span> {s.title}
                    {s.levelLabel && <span class="dash-level"> · {s.levelLabel}</span>}
                  </span>
                  <Meter value={s.mastery} label={`שליטה ${Math.round(s.mastery * 100)}%`} />
                  <span class={`dash-status is-${s.status}`}>{STATUS[s.status]}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}

function Stat({ label, value, sub, test }: { label: string; value: string; sub: string; test: string }) {
  return (
    <div class="dash-stat" data-stat={test}>
      <span class="dash-stat-label">{label}</span>
      <span class="dash-stat-value">{value}</span>
      <span class="dash-stat-sub">{sub}</span>
    </div>
  );
}

/** A small bar, 0..1 (SVG, colours from variables). */
function Meter({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg class="dash-meter" viewBox="0 0 100 10" preserveAspectRatio="none" role="img" aria-label={label}>
      <rect class="dash-meter-bg" x="0" y="0" width="100" height="10" rx="5" />
      {v > 0 && <rect class="dash-meter-fg" x={100 - Math.max(6, v * 100)} y="0" width={Math.max(6, v * 100)} height="10" rx="5" />}
    </svg>
  );
}

/** The last seven days as bars, today on the left (RTL: the newest at the reading end). */
function WeekBars({ time }: { time: TimeStats }) {
  const max = Math.max(60_000, ...time.week.map((d) => d.ms));
  const W = 7 * 40;
  const label = time.week.map((d) => `${weekdayLabel(d.day)}: ${durationText(d.ms)}`).join(', ');
  // RTL: the oldest day on the right, today on the left.
  const days = [...time.week].reverse();
  return (
    <svg class="dash-week" viewBox={`0 0 ${W} 90`} role="img" aria-label={`השבוע: ${label}`} data-testid="dash-week">
      {days.map((d, i) => {
        const h = d.ms > 0 ? Math.max(4, (d.ms / max) * 64) : 0;
        const x = i * 40 + 8;
        return (
          <g key={d.day}>
            <rect class="dash-week-bg" x={x} y={4} width={24} height={64} rx={6} />
            {h > 0 && <rect class={i === 0 ? 'dash-week-today' : 'dash-week-fg'} x={x} y={68 - h} width={24} height={h} rx={6} />}
            <text class="dash-week-label" x={x + 12} y={86} text-anchor="middle">
              {weekdayLabel(d.day)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
