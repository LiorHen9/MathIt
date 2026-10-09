// The end of the journey (phase 10): after the last chapter's party, the journey's own – the
// `journeyDone` celebration, the world's closing sentence (World.story.finale) – and a certificate
// in the world's colours with the child's name, to keep: save it as a picture or share it through
// the phone's share sheet (screens/certificate.ts). A tap skips the party. Also reachable later from
// "my achievements" (the end-of-journey badge). Loaded lazily.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { JOURNEY, allNodes, isDone } from '../core/quest/index';
import { emit, hushFeedback, setFxWorld } from '../fx/director';
import { Hero, setHeroMood, useHeroMood } from '../fx/Hero';
import { reducedMotion } from '../fx/motion';
import { SpeakButton, useAutoSpeak } from '../components/Speak';
import { byGender, type Profile } from '../profiles/profiles';
import { getQuestRecord, type QuestRecord } from '../storage/questProgress';
import { useWorld } from '../worlds/index';
import { playSfx } from '../audio/sfx';
import { certificatePng, certificateSvg, readColors, type CertificateText } from './certificate';
import '../ui/phase10.css';

interface Props {
  profile: Profile;
  onMap: () => void;
  /** Coming back to see the certificate (no party). */
  replay?: boolean;
}

export function Finale({ profile, onMap, replay = false }: Props) {
  const world = useWorld();
  const mood = useHeroMood();
  const [phase, setPhase] = useState<'party' | 'done'>(replay ? 'done' : 'party');
  const [rec, setRec] = useState<QuestRecord | null>(null);
  const [saved, setSaved] = useState<'ok' | 'fail' | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const timers = useRef<number[]>([]);

  const title = `${byGender(profile, 'סיימת', 'סיימת', 'סיימתם')} את כל המסע!`;
  const story = world.story?.finale ?? 'המסע הושלם!';
  useAutoSpeak(replay ? null : `${title} ${story}`, 'finale');

  useEffect(() => {
    setFxWorld(world.id);
    void getQuestRecord(profile.id).then(setRec);
    if (!replay) {
      timers.current.push(window.setTimeout(() => emit({ type: 'journeyDone' }, { el: titleRef.current }), reducedMotion() ? 100 : 400));
      timers.current.push(window.setTimeout(() => setPhase('done'), reducedMotion() ? 1000 : 3600));
    }
    return () => {
      timers.current.forEach(clearTimeout);
      hushFeedback();
    };
  }, []);

  function skip() {
    if (phase !== 'party') return;
    timers.current.forEach(clearTimeout);
    hushFeedback();
    setHeroMood('happy');
    setPhase('done');
  }

  const text: CertificateText | null = useMemo(() => {
    if (!rec) return null;
    const nodes = allNodes();
    const stars = Object.values(rec.stars).reduce((a, b) => a + b, 0);
    const puzzles = nodes.filter((n) => n.kind === 'puzzle' && isDone(n, rec)).length;
    const d = new Date();
    return {
      name: profile.name,
      line: byGender(profile, 'סיים את כל המסע בעולם החשבון', 'סיימה את כל המסע בעולם החשבון', 'סיימו את כל המסע בעולם החשבון'),
      facts: `${JOURNEY.chapters.length} פרקים · ${stars} כוכבים · ${puzzles} חידות`,
      world: world.name,
      icon: world.icon,
      date: `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
    };
  }, [rec, world.id]);
  // Drawn after the world's colours are on the page (they are by the time the record is read).
  const svg = useMemo(() => (text ? certificateSvg(text, readColors()) : ''), [text]);

  async function keep(how: 'share' | 'save') {
    if (!text) return;
    playSfx('tap');
    try {
      const file = await certificatePng(text, readColors());
      if (how === 'share' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'התעודה שלי מ-MathIt' });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      setSaved('ok');
    } catch (e) {
      // Cancelling the share sheet is not a failure.
      setSaved((e as Error)?.name === 'AbortError' ? null : 'fail');
    }
  }

  const canShare = typeof navigator.share === 'function';
  return (
    <main class={`screen finale is-${phase}`} data-testid="finale" data-phase={phase} onClick={skip}>
      <h1 class="celebrate-title" ref={titleRef}>
        {title}
      </h1>
      {phase === 'party' ? (
        <>
          <div class="chapter-end-stage" aria-hidden="true">
            <Hero def={world.hero!} gender={profile.gender} state={mood.state} key={mood.n} class="chapter-end-hero" />
          </div>
          <p class="chapter-end-story">
            {story} <SpeakButton text={`${title} ${story}`} class="speak-inline" />
          </p>
          <button type="button" class="btn btn-ghost skip-btn" data-testid="finale-skip">
            {byGender(profile, 'גע', 'געי', 'געו')} כדי לדלג ⏭
          </button>
        </>
      ) : (
        <>
          <p class="chapter-end-story">{story}</p>
          {/* The certificate: the same SVG that becomes the picture file. */}
          <div class="certificate" data-testid="certificate" dangerouslySetInnerHTML={{ __html: svg }} />
          <div class="finale-actions">
            {canShare && (
              <button type="button" class="btn btn-primary" data-testid="certificate-share" onClick={() => void keep('share')}>
                📤 שיתוף התעודה
              </button>
            )}
            <button type="button" class={`btn ${canShare ? 'btn-secondary' : 'btn-primary'}`} data-testid="certificate-save" onClick={() => void keep('save')}>
              💾 שמירה כתמונה
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              data-testid="finale-map"
              onClick={() => {
                playSfx('tap');
                onMap();
              }}
            >
              🗺️ חזרה למפה
            </button>
          </div>
          <p class={`feedback ${saved === 'ok' ? 'is-good' : saved === 'fail' ? 'is-bad' : ''}`} role="status" data-testid="certificate-saved">
            {saved === 'ok' ? '✓ התעודה נשמרה.' : saved === 'fail' ? 'לא הצלחנו לשמור. אפשר לצלם את המסך.' : ''}
          </p>
        </>
      )}
    </main>
  );
}
