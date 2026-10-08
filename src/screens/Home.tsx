// Free practice (the profile's home before the quest map): every skill with its best stars,
// "practice" and "lesson" (✓ once watched). Phase 6: a small mastery meter per skill (a bar that
// grows by transform), a crown on a mastered one, and "recommended" by the mastery engine – due
// for review first, then what to learn next – not only by age.
// Since phase 4 the quest map is the main screen and this is one tap away from it ("תרגול חופשי");
// rounds and lessons from here do not move the map.
import { useEffect, useState } from 'preact/hooks';
import { playSfx } from '../audio/sfx';
import { SpeakButton, useAutoSpeak } from '../components/Speak';
import { SKILLS, recommendedSkills } from '../core/skills/index';
import { isDue, isMastered, recommendByMastery } from '../core/mastery/index';
import { now } from '../app/clock';
import type { SkillId } from '../core/types';
import { ageBand, type Profile } from '../profiles/profiles';
import { listSkillStates, type SkillState } from '../storage/skillStates';

interface Props {
  profile: Profile;
  /** Back to the quest map. */
  onBack: () => void;
  onPlay: (skill: SkillId) => void;
  onLesson: (skill: SkillId) => void;
}

export function Home({ profile, onBack, onPlay, onLesson }: Props) {
  const [states, setStates] = useState<Record<string, SkillState> | null>(null);
  const ask = 'מה נתרגל היום?';
  // Ages 5–7: one sentence to hear.
  const speech = ask;
  useAutoSpeak(speech, profile.id);
  const byAge = recommendedSkills(ageBand(profile));
  const t = now();
  const recommended = states ? recommendByMastery(SKILLS, states, byAge, t) : [];

  useEffect(() => {
    let alive = true;
    void listSkillStates(profile.id).then((s) => alive && setStates(s));
    return () => {
      alive = false;
    };
  }, [profile.id]);

  return (
    <main class="screen home">
      <header class="topbar">
        <button
          type="button"
          class="btn btn-ghost"
          data-testid="practice-back"
          onClick={() => {
            playSfx('tap');
            onBack();
          }}
        >
          <span aria-hidden="true">→</span> למפה
        </button>
        <h1 class="topbar-title">🎯 תרגול חופשי</h1>
        <span />
      </header>

      <section class="skills" aria-labelledby="skills-title">
        <h2 class="section-title skills-title" id="skills-title">
          {ask} <SpeakButton text={speech} class="speak-inline" />
        </h2>
        <div class="skill-grid">
          {SKILLS.map((s) => {
            const st = states?.[s.id];
            const rec = recommended.includes(s.id);
            const crown = isMastered(st);
            const due = isDue(st, t);
            const m = st?.mastery ?? 0;
            return (
              <div class={`skill-card ${rec ? 'is-rec' : ''} ${crown ? 'is-mastered' : ''}`} key={s.id}>
                <button
                  type="button"
                  class={`skill-btn ${rec ? 'is-rec' : ''} ${crown ? 'is-mastered' : ''}`}
                  data-skill={s.id}
                  data-rec={rec ? 'yes' : 'no'}
                  data-mastered={crown ? 'yes' : 'no'}
                  aria-label={`תרגול: ${s.title}`}
                  onClick={() => {
                    playSfx('tap');
                    onPlay(s.id);
                  }}
                >
                  <span class="skill-icon" aria-hidden="true">
                    {s.icon}
                  </span>
                  <span class="skill-name">{s.title}</span>
                  {rec && <span class="skill-rec">{due ? 'לחזור' : 'מומלץ'}</span>}
                  {crown && (
                    <span class="skill-crown" data-testid="crown" aria-label="נשלט">
                      👑
                    </span>
                  )}
                  <span class="skill-stars" aria-label={st ? `${st.bestStars} מתוך 3 כוכבים` : 'עוד לא שיחקנו'}>
                    {[1, 2, 3].map((n) => (
                      <span key={n} class={st && n <= st.bestStars ? 'is-on' : ''} aria-hidden="true">
                        ★
                      </span>
                    ))}
                  </span>
                  <span class="mastery-meter" role="meter" aria-label="שליטה" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(m * 100)} data-mastery={m.toFixed(2)}>
                    <span class="mastery-fill" style={`transform:scaleX(${m.toFixed(3)})`} />
                  </span>
                  <span class="skill-play" aria-hidden="true">
                    ▶ תרגול
                  </span>
                </button>
                <button
                  type="button"
                  class={`lesson-btn ${st?.lessonSeen ? 'is-seen' : ''}`}
                  data-lesson={s.id}
                  aria-label={`שיעור: ${s.title}${st?.lessonSeen ? ' (נצפה)' : ''}`}
                  onClick={() => {
                    playSfx('tap');
                    onLesson(s.id);
                  }}
                >
                  📖 שיעור{st?.lessonSeen && <span class="lesson-seen"> ✓</span>}
                </button>
              </div>
            );
          })}
        </div>
      </section>

    </main>
  );
}
