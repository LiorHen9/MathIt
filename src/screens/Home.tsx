// The profile's home – until the quest map arrives (phase 4): a greeting, the hero of their
// world (tap: the world's sound and a hop), and the four skills, the ones for the child's age
// marked "recommended", each with its best stars so far, "practice" and a "lesson" button
// (✓ once the lesson was watched).
import { useEffect, useRef, useState } from 'preact/hooks';
import { playSfx, type SfxName } from '../audio/sfx';
import { Hero } from '../fx/Hero';
import { hop } from '../fx/motion';
import { NarrationHelp, SpeakButton, useAutoSpeak } from '../components/Speak';
import { SKILLS, recommendedSkills } from '../core/skills/index';
import type { SkillId } from '../core/types';
import { ageBand, byGender, stageLabel, type Profile } from '../profiles/profiles';
import { listSkillStates, type SkillState } from '../storage/skillStates';
import { useWorld } from '../worlds/index';

interface Props {
  profile: Profile;
  onSwitch: () => void;
  onSettings: () => void;
  onPlay: (skill: SkillId) => void;
  onLesson: (skill: SkillId) => void;
}

export function Home({ profile, onSwitch, onSettings, onPlay, onLesson }: Props) {
  const world = useWorld();
  const stage = useRef<HTMLButtonElement>(null);
  const [states, setStates] = useState<Record<string, SkillState>>({});
  const heroName = world.hero?.name(profile.gender) ?? '';
  const greeting = `שלום ${profile.name}!`;
  const ask = 'מה נתרגל היום?';
  // Ages 5–7: one sentence to hear.
  const speech = `שלום ${profile.name}, מה נתרגל היום?`;
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
          data-testid="switch-profile"
          onClick={() => {
            playSfx('tap');
            onSwitch();
          }}
        >
          <span aria-hidden="true">⇄</span> מי משחק?
        </button>
        <span />
        <button
          type="button"
          class="icon-btn"
          data-testid="open-settings"
          aria-label="הגדרות"
          onClick={() => {
            playSfx('tap');
            onSettings();
          }}
        >
          ⚙️
        </button>
      </header>

      <section class="home-hello enter">
        <h1 class="home-title">
          <span class="avatar avatar-md" aria-hidden="true">
            {profile.avatar}
          </span>{' '}
          {greeting}
        </h1>
        <p class="home-sub">
          {world.icon} {world.name} · {stageLabel(profile)}
        </p>
      </section>

      {world.hero && (
        <button
          ref={stage}
          type="button"
          class="home-stage"
          data-testid="home-hero"
          aria-label={`${heroName} – לחיצה להגיד שלום`}
          onClick={() => {
            playSfx(`world-${world.id}` as SfxName);
            hop(stage.current?.querySelector('.hero'));
          }}
        >
          <Hero def={world.hero} gender={profile.gender} />
          <span class="home-hero-name">{heroName}</span>
          <span class="home-hint">{byGender(profile, 'גע', 'געי', 'געו')} בי כדי להגיד שלום 👋</span>
        </button>
      )}

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

      <NarrationHelp />
    </main>
  );
}
