// The profile's home – for now a greeting with the hero of their world, until the quest map
// arrives (phase 4). Tapping the hero plays the world's sample sound and makes it hop.
import { useRef } from 'preact/hooks';
import { playSfx, type SfxName } from '../audio/sfx';
import { Hero } from '../fx/Hero';
import { hop } from '../fx/motion';
import { NarrationHelp, SpeakButton, useAutoSpeak } from '../components/Speak';
import { byGender, stageLabel, type Profile } from '../profiles/profiles';
import { useWorld } from '../worlds/index';

interface Props {
  profile: Profile;
  onSwitch: () => void;
  onSettings: () => void;
}

export function Home({ profile, onSwitch, onSettings }: Props) {
  const world = useWorld();
  const stage = useRef<HTMLButtonElement>(null);
  const heroName = world.hero?.name(profile.gender) ?? '';
  const greeting = `שלום ${profile.name}!`;
  // Ages 5–7: one sentence to hear.
  const soon = `המסע בעולם ה${world.name} מתחיל בקרוב!`;
  useAutoSpeak(`${greeting} ${soon}`, profile.id);

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

      <p class="card home-soon">
        {soon} <SpeakButton text={`${greeting} ${soon}`} class="speak-inline" />
      </p>

      <NarrationHelp />
    </main>
  );
}
