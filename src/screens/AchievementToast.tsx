// A new achievement (phase 10): a badge drops in at the top of whatever screen is up, the world's
// celebration plays through the Feedback Director (`achievement`), and after a few seconds – or a
// tap – it slides away and the next one (if several opened together) takes its place. Never blocks
// the game: it covers only the middle of the top bar and goes by itself. App keeps the queue and
// the aria-live region around it (the region stays; only its content changes). Loaded lazily.
import { useEffect, useRef, useState } from 'preact/hooks';
import { getAchievement, type AchievementId } from '../core/achievements/index';
import { emit, setFxWorld } from '../fx/director';
import { reducedMotion } from '../fx/motion';
import { SpeakButton } from '../components/Speak';
import { byGender, type Profile } from '../profiles/profiles';
import '../ui/phase10.css';

/** How long a badge stays (a tap sends it away sooner). */
export const TOAST_MS = 3600;

interface Props {
  id: AchievementId;
  profile: Profile;
  onDone: () => void;
}

export function AchievementToast({ id, profile, onDone }: Props) {
  const a = getAchievement(id);
  const badge = useRef<HTMLSpanElement>(null);
  const [out, setOut] = useState(false);
  const gone = useRef(false);
  const timers = useRef<number[]>([]);

  function leave() {
    if (gone.current) return;
    gone.current = true;
    setOut(true);
    timers.current.push(window.setTimeout(onDone, reducedMotion() ? 120 : 220));
  }

  useEffect(() => {
    setFxWorld(profile.worldId);
    // After it has dropped in, so the burst is where the badge is.
    timers.current.push(window.setTimeout(() => emit({ type: 'achievement' }, { el: badge.current }), reducedMotion() ? 60 : 260));
    timers.current.push(window.setTimeout(leave, TOAST_MS));
    return () => timers.current.forEach(clearTimeout);
  }, []);

  if (!a) return null;
  const title = byGender(profile, a.title.m, a.title.f, a.title.x);
  const text = byGender(profile, a.text.m, a.text.f, a.text.x);
  return (
    <div class={`ach-toast ${out ? 'is-out' : ''}`} data-testid="achievement-toast" data-achievement={id} onClick={leave}>
      <span class="ach-badge" ref={badge} aria-hidden="true">
        {a.icon}
      </span>
      <span class="ach-toast-body">
        <span class="ach-toast-kicker">הישג חדש!</span>
        <strong class="ach-toast-title">{title}</strong>
        <span class="ach-toast-text">{text}</span>
      </span>
      <SpeakButton text={`הישג חדש! ${title}. ${text}`} class="speak-inline" />
    </div>
  );
}
