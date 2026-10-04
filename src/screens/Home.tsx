// Free practice (the profile's home before the quest map): every skill with its best stars,
// "practice" and "lesson" (✓ once watched), the ones for the child's age marked "recommended".
// Since phase 4 the quest map is the main screen and this is one tap away from it ("תרגול חופשי");
// rounds and lessons from here do not move the map.
import { useEffect, useState } from 'preact/hooks';
import { playSfx } from '../audio/sfx';
import { SpeakButton, useAutoSpeak } from '../components/Speak';
import { SKILLS, recommendedSkills } from '../core/skills/index';
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
  const [states, setStates] = useState<Record<string, SkillState>>({});
  const ask = 'מה נתרגל היום?';
  // Ages 5–7: one sentence to hear.
  const speech = ask;
  useAutoSpeak(speech, profile.id);
  const recommended = recommendedSkills(ageBand(profile));

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
            const st = states[s.id];
            const rec = recommended.includes(s.id);
            return (
              <div class={`skill-card ${rec ? 'is-rec' : ''}`} key={s.id}>
                <button
                  type="button"
                  class={`skill-btn ${rec ? 'is-rec' : ''}`}
                  data-skill={s.id}
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
                  {rec && <span class="skill-rec">מומלץ</span>}
                  <span class="skill-stars" aria-label={st ? `${st.bestStars} מתוך 3 כוכבים` : 'עוד לא שיחקנו'}>
                    {[1, 2, 3].map((n) => (
                      <span key={n} class={st && n <= st.bestStars ? 'is-on' : ''} aria-hidden="true">
                        ★
                      </span>
                    ))}
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
