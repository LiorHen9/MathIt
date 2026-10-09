// The end of a chapter (phase 10): the first time a chapter's boss is beaten, a long party – the
// hero cheers, the boss runs off the screen, the world's sentence for the chapter's end is read
// (World.story.ends), the confetti of `chapterDone` falls – and then the chapter's summary: stars,
// puzzles solved, the world's coins. A tap anywhere skips straight to the summary. After the last
// chapter the way goes on to the end of the journey (screens/Finale.tsx). Loaded lazily.
import { useEffect, useRef, useState } from 'preact/hooks';
import { JOURNEY, chapterMaxStars, chapterNodes, chapterOf, chapterStars, isDone } from '../core/quest/index';
import { emit, hushFeedback, setFxWorld } from '../fx/director';
import { Hero, setHeroMood, useHeroMood } from '../fx/Hero';
import { reducedMotion } from '../fx/motion';
import { SpeakButton, useAutoSpeak } from '../components/Speak';
import { byGender, type Profile } from '../profiles/profiles';
import { getQuestRecord, type QuestRecord } from '../storage/questProgress';
import { getInventory } from '../storage/inventory';
import { bossOf, useWorld } from '../worlds/index';
import { playSfx } from '../audio/sfx';
import { BossArt } from './quest/art';
import '../ui/phase10.css';

interface Props {
  profile: Profile;
  /** The boss station that was beaten. */
  nodeId: string;
  /** Back to the map (it walks on to the next chapter). */
  onMap: () => void;
  /** After the last chapter: the end of the journey. */
  onFinale: () => void;
}

/** How long the party runs before the summary shows by itself. */
export const PARTY_MS = 4200;

export function ChapterEnd({ profile, nodeId, onMap, onFinale }: Props) {
  const world = useWorld();
  const chapter = chapterOf(nodeId) ?? JOURNEY.chapters[0];
  const k = JOURNEY.chapters.indexOf(chapter);
  const last = k === JOURNEY.chapters.length - 1;
  const def = bossOf(world, k + 1);
  const Art = def?.Art ?? BossArt;
  const mood = useHeroMood();
  const [phase, setPhase] = useState<'party' | 'summary'>('party');
  const [rec, setRec] = useState<QuestRecord | null>(null);
  const [coins, setCoins] = useState<number | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const timers = useRef<number[]>([]);
  const later = (f: () => void, ms: number) => timers.current.push(window.setTimeout(f, ms));

  const title = `${byGender(profile, 'סיימת', 'סיימת', 'סיימתם')} את פרק ${k + 1}!`;
  const story = world.story?.ends?.[k] ?? `${chapter.title} – הושלם!`;
  useAutoSpeak(`${title} ${story}`, 'chapter-end');

  useEffect(() => {
    setFxWorld(world.id);
    void getQuestRecord(profile.id).then(setRec);
    void getInventory(profile.id, world.id).then((inv) => setCoins(inv.coins));
    const fast = reducedMotion();
    later(() => emit({ type: 'chapterDone', chapter: k + 1 }, { el: titleRef.current }), fast ? 100 : 500);
    // The hero keeps cheering while the boss runs away.
    later(() => setHeroMood('cheer'), fast ? 0 : 1900);
    later(() => setPhase('summary'), fast ? 1200 : PARTY_MS);
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
    setPhase('summary');
  }

  const nodes = chapterNodes(chapter);
  const puzzles = nodes.filter((n) => n.kind === 'puzzle');
  const solved = rec ? puzzles.filter((n) => isDone(n, rec)).length : 0;
  const stars = rec ? chapterStars(chapter, rec) : 0;
  const max = chapterMaxStars(chapter);

  return (
    <main class={`screen chapter-end is-${phase}`} data-testid="chapter-end" data-chapter={k + 1} data-phase={phase} onClick={skip}>
      <h1 class="celebrate-title chapter-end-title" ref={titleRef}>
        {title}
      </h1>
      <div class="chapter-end-stage" aria-hidden="true">
        <Hero def={world.hero!} gender={profile.gender} state={phase === 'party' ? mood.state : 'happy'} key={mood.n} class="chapter-end-hero" />
        {phase === 'party' && (
          <div class="chapter-end-boss">
            <Art class={`boss-big boss-tier-${k + 1}`} state="idle" />
          </div>
        )}
      </div>
      <p class="chapter-end-story" data-testid="chapter-end-story">
        {story} <SpeakButton text={`${title} ${story}`} class="speak-inline" />
      </p>

      {phase === 'party' ? (
        <button type="button" class="btn btn-ghost skip-btn" data-testid="chapter-end-skip">
          {byGender(profile, 'גע', 'געי', 'געו')} כדי לדלג ⏭
        </button>
      ) : (
        <>
          <ul class="chapter-sum" data-testid="chapter-summary">
            <li data-sum="stars" data-value={stars}>
              <span class="chapter-sum-icon" aria-hidden="true">
                ⭐
              </span>
              <span class="chapter-sum-num" dir="ltr">
                {stars}/{max}
              </span>
              <span class="chapter-sum-label">כוכבים בפרק</span>
            </li>
            {puzzles.length > 0 && (
              <li data-sum="puzzles" data-value={solved}>
                <span class="chapter-sum-icon" aria-hidden="true">
                  🧩
                </span>
                <span class="chapter-sum-num" dir="ltr">
                  {solved}/{puzzles.length}
                </span>
                <span class="chapter-sum-label">חידות</span>
              </li>
            )}
            <li data-sum="coins" data-value={coins ?? 0}>
              <span class="chapter-sum-icon" aria-hidden="true">
                {world.coin?.icon ?? '🪙'}
              </span>
              <span class="chapter-sum-num" dir="ltr">
                {coins ?? 0}
              </span>
              <span class="chapter-sum-label">{world.coin?.name ?? 'מטבעות'}</span>
            </li>
          </ul>
          {last ? (
            <button
              type="button"
              class="btn btn-primary btn-big"
              data-testid="to-finale"
              onClick={() => {
                playSfx('tap');
                onFinale();
              }}
            >
              🏆 לסוף המסע
            </button>
          ) : (
            <button
              type="button"
              class="btn btn-primary btn-big"
              data-testid="chapter-end-next"
              onClick={() => {
                playSfx('tap');
                onMap();
              }}
            >
              🗺️ לפרק {k + 2}
            </button>
          )}
        </>
      )}
    </main>
  );
}
