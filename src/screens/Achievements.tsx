// "My achievements" (ההישגים שלי, phase 10): every achievement (core/achievements), the ones won
// in colour with the day they opened, the rest as quiet outlines with how far along the child is
// (a bar that grows by transform). Next to "my collection" on the map; loaded lazily.
import { useEffect, useState } from 'preact/hooks';
import { ACHIEVEMENTS, achieved, type AchievementInput } from '../core/achievements/index';
import { SpeakButton, useAutoSpeak } from '../components/Speak';
import { byGender, type Profile } from '../profiles/profiles';
import { achievementInput } from '../storage/achievements';
import { getAchievementRecord, type AchievementRecord } from '../storage/achievementRecord';
import { playSfx } from '../audio/sfx';
import '../ui/phase10.css';

interface Props {
  profile: Profile;
  onBack: () => void;
  /** The end-of-journey certificate again (the last badge). */
  onCertificate: () => void;
}

/** "9.10" – the day an achievement opened. */
function dayLabel(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

export function Achievements({ profile, onBack, onCertificate }: Props) {
  const [data, setData] = useState<{ input: AchievementInput; rec: AchievementRecord } | null>(null);

  useEffect(() => {
    let alive = true;
    void getAchievementRecord(profile.id).then(async (rec) => {
      const input = await achievementInput(profile.id, rec);
      if (alive) setData({ input, rec });
    });
    return () => {
      alive = false;
    };
  }, [profile.id]);

  const won = data ? new Set([...Object.keys(data.rec.unlocked), ...achieved(data.input)]) : new Set<string>();
  const total = ACHIEVEMENTS.length;
  const line =
    won.size === 0
      ? `עוד אין הישגים – ${byGender(profile, 'שחק', 'שחקי', 'שחקו')} ו${byGender(profile, 'תראה', 'תראי', 'תראו')} מה נפתח!`
      : won.size === total
        ? `${byGender(profile, 'השגת', 'השגת', 'השגתם')} את כל ההישגים!`
        : `יש לך ${won.size} ${won.size === 1 ? 'הישג' : 'הישגים'}!`;
  useAutoSpeak(data ? line : null, 'achievements');

  if (!data) return <main class="screen loading" aria-busy="true" />;
  return (
    <main class="screen achievements" data-testid="achievements">
      <header class="topbar">
        <button
          type="button"
          class="btn btn-ghost"
          data-testid="achievements-back"
          onClick={() => {
            playSfx('tap');
            onBack();
          }}
        >
          <span aria-hidden="true">→</span> למפה
        </button>
        <h1 class="topbar-title">🏅 ההישגים שלי</h1>
        <span />
      </header>

      <p class="collection-line">
        {line} <SpeakButton text={line} class="speak-inline" />
      </p>
      <p class="collection-count" data-testid="achievements-count" data-won={won.size}>
        <span dir="ltr">
          {won.size}/{total}
        </span>
      </p>

      <ul class="ach-grid">
        {ACHIEVEMENTS.map((a) => {
          const has = won.has(a.id);
          const title = byGender(profile, a.title.m, a.title.f, a.title.x);
          const text = byGender(profile, a.text.m, a.text.f, a.text.x);
          const at = data.rec.unlocked[a.id];
          const p = !has && a.progress ? a.progress(data.input) : null;
          return (
            <li key={a.id} class={`ach-card ${has ? 'is-won' : 'is-locked'}`} data-achievement={a.id} data-won={has ? 'yes' : 'no'}>
              <span class="ach-icon" aria-hidden="true">
                {a.icon}
              </span>
              <span class="ach-title">{title}</span>
              <span class="ach-text">{text}</span>
              {has && at ? (
                <span class="ach-date">
                  <span class="visually-hidden">נפתח ב-</span>
                  <span dir="ltr">{dayLabel(at)}</span>
                </span>
              ) : null}
              {!has && <span class="visually-hidden">עוד לא</span>}
              {has && a.id === 'journey-end' && (
                <button
                  type="button"
                  class="btn btn-secondary ach-cert"
                  data-testid="open-certificate"
                  onClick={() => {
                    playSfx('tap');
                    onCertificate();
                  }}
                >
                  📜 התעודה
                </button>
              )}
              {p && (
                <span class="ach-progress" role="meter" aria-label={`${title}: ${p.done} מתוך ${p.target}`} aria-valuemin={0} aria-valuemax={p.target} aria-valuenow={p.done}>
                  <span class="ach-progress-bar" aria-hidden="true">
                    <span class="ach-progress-fill" style={`transform:scaleX(${(p.done / p.target).toFixed(3)})`} />
                  </span>
                  <span class="ach-progress-num" dir="ltr" aria-hidden="true">
                    {p.done}/{p.target}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
