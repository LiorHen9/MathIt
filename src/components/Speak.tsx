// The 🔊 button, reading aloud on new text, and the parents' note on adding a Hebrew voice.
// Adapted from ChessIt. Phase 1 connects narration to the profile's settings (setNarration) and
// brings back the one-time "no Hebrew voice" note.
import { useEffect } from 'preact/hooks';
import { autoSpeak, speak, useHebrewVoice } from '../audio/speech';

/** 🔊 – hidden when the phone has no Hebrew voice. `text` may be a function (read at tap time). */
export function SpeakButton({ text, class: cls = '' }: { text: string | (() => string); class?: string }) {
  const has = useHebrewVoice();
  if (!has) return null;
  return (
    <button
      type="button"
      class={`speak-btn ${cls}`}
      aria-label="הקראה"
      onClick={(e) => {
        e.stopPropagation();
        speak(typeof text === 'function' ? text() : text);
      }}
    >
      🔊
    </button>
  );
}

/** Read `text` aloud whenever `key` changes, if the profile has narration on. */
export function useAutoSpeak(text: string | null, key: unknown = text): void {
  useEffect(() => {
    if (text) autoSpeak(text);
  }, [key]);
}

export type Tone = 'info' | 'good' | 'bad';
export interface Message {
  text: string;
  tone: Tone;
  id: number;
  /** What to read aloud, when it differs from the text. */
  speech?: string;
}

/** A feedback line (read aloud when narration is on). */
export function Feedback({ message, idle }: { message: Message | null; idle?: string }) {
  useAutoSpeak(message ? (message.speech ?? message.text) : null, message?.id);
  return (
    // The paragraph stays in place (a live region must exist before its text changes, or screen
    // readers miss it); the message inside is new each time, which replays the pop animation.
    <p class={`feedback ${message ? `is-${message.tone}` : ''}`} aria-live="polite">
      {message ? (
        <span class="feedback-msg" key={message.id}>
          {message.text} <SpeakButton text={message.speech ?? message.text} class="speak-inline" />
        </span>
      ) : (
        (idle ?? ' ')
      )}
    </p>
  );
}

/** How to install a Hebrew voice, for a parent. */
export function SpeechInstall() {
  return (
    <div class="speech-install">
      <p>להורים: אפשר להוסיף קול עברי בהגדרות הטלפון, ואז לפתוח מחדש את האפליקציה.</p>
      <ul>
        <li>
          <strong>אנדרואיד:</strong> הגדרות ← ניהול כללי (או מערכת) ← שפה וקלט ← פלט המרת טקסט לדיבור ← מנוע Google ← התקנת נתוני קול ←
          עברית.
        </li>
        <li>
          <strong>אייפון:</strong> הגדרות ← נגישות ← תוכן מוקרא ← קולות ← עברית ← להוריד קול (למשל כרמית).
        </li>
      </ul>
    </div>
  );
}
