// A puzzle station (phase 9): one puzzle – a magic square, a balance, a missing number or a small
// KenKen – made from a fresh seed each time it is played (core/puzzles, exactly one solution). The
// hero stands beside it; "💡 רמז" gives a hint (the board fills one piece or says how to undo the
// exercise); a full board that is not right is a slip, said gently. Solved: the world's own burst
// (the `puzzleSolved` event through the Feedback Director), stars by hints and slips (puzzleStars),
// saved for the station like a practice round's (storage/questProgress.ts – no store of its own).
// Each kind of puzzle is its own chunk (games/puzzles/), loaded when first played.
import type { ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { findNode, type PuzzleNode } from '../core/quest/index';
import { PUZZLE_TITLES, puzzleStars, type PuzzleId } from '../core/puzzles/types';
import { emit, hushFeedback, setFxWorld } from '../fx/director';
import { Hero, setHeroMood, useHeroMood } from '../fx/Hero';
import { Feedback, SpeakButton, useAutoSpeak, type Message } from '../components/Speak';
import { byGender, type Profile } from '../profiles/profiles';
import { recordNodeStars } from '../storage/questProgress';
import { useWorld } from '../worlds/index';
import { playSfx } from '../audio/sfx';
import type { PuzzleProps } from '../games/puzzles/types';
import '../games/puzzles/puzzles.css';

const BOARDS: Record<PuzzleId, () => Promise<ComponentType<PuzzleProps>>> = {
  magic: () => import('../games/puzzles/Magic').then((m) => m.Magic),
  balance: () => import('../games/puzzles/Balance').then((m) => m.Balance),
  missing: () => import('../games/puzzles/Missing').then((m) => m.Missing),
  kenken: () => import('../games/puzzles/KenKen').then((m) => m.KenKen)
};

/** A seed asked for in the address (`?puzzleSeed=5`) – for tests. */
function askedSeed(): number | null {
  const s = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('puzzleSeed') : null;
  return s !== null && /^\d+$/.test(s) ? Number(s) : null;
}

let msgId = 0;
const say = (text: string, tone: Message['tone'] = 'info'): Message => ({ text, tone, id: ++msgId });

interface Props {
  profile: Profile;
  nodeId: string;
  onMap: () => void;
}

export function PuzzleHost({ profile, nodeId, onMap }: Props) {
  const node = findNode(nodeId) as PuzzleNode;
  const world = useWorld();
  const mood = useHeroMood();
  const [Board, setBoard] = useState<ComponentType<PuzzleProps> | null>(null);
  const [seed, setSeed] = useState(() => askedSeed() ?? Math.floor(Math.random() * 0x7fffffff));
  const [game, setGame] = useState(0);
  const [hint, setHint] = useState(0);
  const [task, setTask] = useState('');
  const [message, setMessage] = useState<Message | null>(null);
  const [end, setEnd] = useState<{ stars: 1 | 2 | 3 } | null>(null);
  const slips = useRef(0);
  const board = useRef<HTMLDivElement>(null);
  const g = (m: string, f: string, n: string) => byGender(profile, m, f, n);
  useAutoSpeak(end ? null : task || null, `${game}:${task}`);

  useEffect(() => {
    setFxWorld(world.id);
    setHeroMood('happy');
    let alive = true;
    void BOARDS[node.puzzle]().then((c) => alive && setBoard(() => c));
    return () => {
      alive = false;
      hushFeedback();
    };
  }, []);

  function mistake(el: Element | null) {
    slips.current++;
    emit({ type: 'wrong', attempt: Math.min(2, slips.current) }, { el });
    setMessage(say(g('עוד לא – נסה לתקן', 'עוד לא – נסי לתקן', 'עוד לא – נסו לתקן'), 'bad'));
  }

  function solved(el: Element | null) {
    const stars = puzzleStars(hint, slips.current);
    void recordNodeStars(profile.id, nodeId, stars);
    emit({ type: 'puzzleSolved', stars }, { el: el ?? board.current });
    setMessage(say(`${g('פתרת', 'פתרת', 'פתרתם')} את החידה!`, 'good'));
    setEnd({ stars });
  }

  function askHint() {
    playSfx('tap');
    emit({ type: 'hint' });
    setHint((h) => h + 1);
  }

  function again() {
    playSfx('tap');
    slips.current = 0;
    setHint(0);
    setEnd(null);
    setMessage(null);
    setSeed(Math.floor(Math.random() * 0x7fffffff));
    setGame((x) => x + 1);
  }

  const idle = g('אפשר לבקש רמז 💡', 'אפשר לבקש רמז 💡', 'אפשר לבקש רמז 💡');
  return (
    <main class={`screen puzzle-screen pz-kind-${node.puzzle}`} data-testid="puzzle" data-puzzle={node.puzzle} data-level={node.level} data-seed={seed} data-state={end ? 'solved' : 'playing'}>
      <header class="topbar">
        <button
          type="button"
          class="icon-btn"
          aria-label="חזרה למפה"
          data-testid="puzzle-close"
          onClick={() => {
            playSfx('tap');
            onMap();
          }}
        >
          ✕
        </button>
        <h1 class="topbar-title">🧩 {node.title || PUZZLE_TITLES[node.puzzle]}</h1>
        <button type="button" class="icon-btn puzzle-hint-btn" aria-label="רמז" data-testid="puzzle-hint" disabled={!!end || !Board} onClick={askHint}>
          💡
        </button>
      </header>

      {task && (
        <p class="puzzle-task" data-testid="puzzle-task">
          {task} <SpeakButton text={task} class="speak-inline" />
        </p>
      )}

      <div class="puzzle-board" ref={board}>
        {Board ? (
          <Board
            key={game}
            level={node.level}
            seed={seed}
            gender={profile.gender}
            hint={hint}
            onHintText={(t) => setMessage(say(`💡 ${t}`, 'info'))}
            onMistake={mistake}
            onSolved={solved}
            onTask={setTask}
          />
        ) : (
          <div class="template-loading" aria-busy="true" />
        )}
      </div>

      {end && (
        <div class="puzzle-end" data-testid="puzzle-end" data-stars={end.stars}>
          <p class="puzzle-stars" role="img" aria-label={`${end.stars} מתוך 3 כוכבים`}>
            {[1, 2, 3].map((n) => (
              <span key={n} class={n <= end.stars ? 'is-on' : ''}>
                ★
              </span>
            ))}
          </p>
          <div class="row celebrate-actions">
            <button type="button" class="btn btn-primary btn-big" data-testid="puzzle-to-map" onClick={onMap}>
              🗺️ ממשיכים במסע
            </button>
            <button type="button" class="btn btn-secondary btn-big" data-testid="puzzle-again" onClick={again}>
              🔁 חידה חדשה
            </button>
          </div>
        </div>
      )}

      <div class="game-hero-row">
        <Hero def={world.hero!} gender={profile.gender} state={mood.state} key={mood.n} class="game-hero" />
        <div class="speech-bubble">
          <Feedback message={message} idle={idle} />
        </div>
      </div>
    </main>
  );
}
