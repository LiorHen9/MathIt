// A treasure chest station (docs/ARCHITECTURE.md §6.1 "journey motion"): a tap and the chest
// rattles, rattles again, the lid flies open in a shine, and the prize flies out to the prize
// shelf. A symbolic prize for now (a sticker); coins and the collection come in phase 5.
// The whole thing is ~2 seconds and a tap skips to the end. Loaded lazily.
import { useEffect, useRef, useState } from 'preact/hooks';
import { findNode, type ChestNode } from '../core/quest/index';
import { emit, hushFeedback, setFxWorld } from '../fx/director';
import { Hero, setHeroMood, useHeroMood } from '../fx/Hero';
import { reducedMotion } from '../fx/motion';
import { SpeakButton, useAutoSpeak } from '../components/Speak';
import { byGender, type Profile } from '../profiles/profiles';
import { openChest } from '../storage/questProgress';
import { useWorld } from '../worlds/index';
import { playSfx } from '../audio/sfx';
import { ChestArt } from './quest/art';

interface Props {
  profile: Profile;
  nodeId: string;
  onMap: () => void;
}

type Phase = 'closed' | 'shaking' | 'open';

export function Chest({ profile, nodeId, onMap }: Props) {
  const node = findNode(nodeId) as ChestNode;
  const world = useWorld();
  const mood = useHeroMood();
  const [phase, setPhase] = useState<Phase>('closed');
  const [landed, setLanded] = useState(false);
  const chest = useRef<HTMLButtonElement>(null);
  const slot = useRef<HTMLSpanElement>(null);
  const timers = useRef<number[]>([]);
  const saved = useRef(false);
  const tapText = byGender(profile, 'גע בתיבה כדי לפתוח אותה', 'געי בתיבה כדי לפתוח אותה', 'געו בתיבה כדי לפתוח אותה');
  const won = `קיבלת ${node.prize.name}!`;
  useAutoSpeak(phase === 'open' ? won : phase === 'closed' ? `תיבת אוצר! ${tapText}.` : null, phase);

  useEffect(() => {
    setFxWorld(world.id);
    setHeroMood('happy');
    return () => {
      timers.current.forEach(clearTimeout);
      hushFeedback();
    };
  }, []);

  function save() {
    if (saved.current) return;
    saved.current = true;
    void openChest(profile.id, nodeId, node.prize.icon);
  }

  function open(skip: boolean) {
    setPhase('open');
    save();
    const lid = chest.current?.querySelector('.chest-lid');
    if (skip || reducedMotion()) {
      // The prize is simply there (no flight across the screen).
      if (!skip) emit({ type: 'chestOpen', prize: node.prize.icon }, { el: chest.current });
      setLanded(true);
      return;
    }
    lid?.animate(
      [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(-42deg)', offset: 0.5 },
        { transform: 'rotate(-30deg)' }
      ],
      { duration: 420, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' }
    );
    emit({ type: 'chestOpen', prize: node.prize.icon }, { el: chest.current, to: slot.current });
    // flyTo lands in ~560ms.
    timers.current.push(window.setTimeout(() => setLanded(true), 600));
  }

  function tap() {
    if (phase === 'closed') {
      playSfx('tap');
      setPhase('shaking');
      const fast = reducedMotion();
      emit({ type: 'chestShake' }, { el: chest.current });
      if (!fast) timers.current.push(window.setTimeout(() => emit({ type: 'chestShake' }, { el: chest.current }), 650));
      timers.current.push(window.setTimeout(() => open(false), fast ? 350 : 1300));
      return;
    }
    if (phase === 'shaking') {
      // A tap skips the rest.
      timers.current.forEach(clearTimeout);
      hushFeedback();
      open(true);
    }
  }

  return (
    <main class={`screen chest-screen is-${phase}`} data-phase={phase} data-testid="chest">
      <header class="topbar">
        <button
          type="button"
          class="icon-btn"
          aria-label="חזרה למפה"
          data-testid="chest-close"
          onClick={() => {
            playSfx('tap');
            onMap();
          }}
        >
          ✕
        </button>
        <h1 class="topbar-title">🎁 {node.title}</h1>
        <span class={`prize-shelf ${landed ? 'is-full' : ''}`} aria-label="הפרס">
          <span ref={slot} class="prize-slot" data-testid="prize-slot">
            {landed ? node.prize.icon : '?'}
          </span>
        </span>
      </header>

      <button type="button" ref={chest} class="chest-btn" data-testid="chest-btn" aria-label={phase === 'open' ? node.prize.name : 'לפתוח את התיבה'} onClick={tap} disabled={phase === 'open'}>
        <ChestArt open={phase === 'open'} class="chest-big" />
      </button>

      {phase === 'open' ? (
        <div class="chest-won">
          <p class="chest-prize" data-testid="chest-prize">
            <span class="chest-prize-icon" aria-hidden="true">
              {node.prize.icon}
            </span>{' '}
            {won} <SpeakButton text={won} class="speak-inline" />
          </p>
          <button type="button" class="btn btn-primary btn-big" data-testid="chest-to-map" onClick={onMap}>
            🗺️ ממשיכים במסע
          </button>
        </div>
      ) : (
        <p class="chest-hint">{tapText} 👆</p>
      )}

      <Hero def={world.hero!} gender={profile.gender} state={mood.state} key={mood.n} class="chest-hero" />
    </main>
  );
}
