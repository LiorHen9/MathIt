// A placeholder after the splash, until phase 1 brings profiles and worlds.
import { versionLabel } from '../app/version';
import { playSfx } from '../audio/sfx';
import { SpeakButton } from '../components/Speak';

const TEXT = 'בקרוב: בוחרים מי משחק ובאיזה עולם – פיות, כדורגל, כדורסל או נינג׳ה.';

export function ComingSoon({ onBack }: { onBack: () => void }) {
  return (
    <main class="screen coming-soon">
      <div class="card enter">
        <h1 class="cs-title">איזה כיף שבאתם! 🎉</h1>
        <p>
          {TEXT} <SpeakButton text={TEXT} class="speak-inline" />
        </p>
        <ul class="cs-worlds" aria-label="העולמות שבדרך">
          <li>🧚</li>
          <li>⚽</li>
          <li>🏀</li>
          <li>🥷</li>
        </ul>
      </div>
      <button
        type="button"
        class="btn btn-secondary"
        onClick={() => {
          playSfx('tap');
          onBack();
        }}
      >
        חזרה
      </button>
      <p class="version">
        גרסה <span class="math">{versionLabel()}</span>
      </p>
    </main>
  );
}
