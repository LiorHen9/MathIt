// The boss at the end of a chapter (docs/ARCHITECTURE.md §4.3 "Boss", §6.1): a short battle of
// questions from several skills, through the same Ask/Pop as a round (hint after one mistake,
// step-by-step explanation after two). Every right answer is a hit – the hero attacks, the boss
// trembles, its power bar drops; a wrong answer and the boss slips aside (gently, no lost lives).
// A question whose answer had to be shown is replaced by a new one, so the boss always falls in
// the end. Then the big celebration and 1–3 stars by how cleanly it went. Loaded lazily.
// The boss is the world's own (World.bosses: the fog witch, the giant goalkeeper…) – its name,
// picture, intro and sounds – on the same station and the same battle. Every hit earns a coin,
// and beating it wins the next collectible of the world (storage/inventory.ts). Every answer
// goes to the mastery engine of its skill (phase 6).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { makeQuestion, makeRound } from '../core/generators/index';
import { findNode, type BossNode } from '../core/quest/index';
import { questionPoints, starsFor } from '../core/round';
import type { Question } from '../core/types';
import { emit, hushFeedback, setFxWorld } from '../fx/director';
import { Hero, setHeroMood, useHeroMood } from '../fx/Hero';
import { reducedMotion } from '../fx/motion';
import { Feedback, SpeakButton, useAutoSpeak, type Message } from '../components/Speak';
import { Ask, msg } from '../games/Ask';
import { byGender, type Profile } from '../profiles/profiles';
import { recordNodeStars } from '../storage/questProgress';
import { recordAnswer } from '../storage/skillStates';
import { bossOf, useWorld, type Collectible } from '../worlds/index';
import { CoinChip, useCoins } from '../components/Coins';
import { addItem, getInventory, nextReward } from '../storage/inventory';
import { playSfx } from '../audio/sfx';
import { BossArt } from './quest/art';

interface Props {
  profile: Profile;
  nodeId: string;
  onMap: () => void;
}

/** The boss's questions: the skills taking turns, no exercise twice. */
function battleQuestions(node: BossNode, seed: number): Question[] {
  const per = Math.ceil(node.hits / node.skillIds.length);
  const rounds = node.skillIds.map((id, k) => makeRound(id, node.level, seed + k * 7919, per));
  const out: Question[] = [];
  for (let i = 0; out.length < node.hits; i++) out.push(rounds[i % rounds.length][Math.floor(i / rounds.length)]);
  return out;
}

type Phase = 'intro' | 'fight' | 'won';

export function Boss({ profile, nodeId, onMap }: Props) {
  const node = findNode(nodeId) as BossNode;
  const world = useWorld();
  const def = bossOf(world);
  const name = def?.name ?? node.title;
  const Art = def?.Art ?? BossArt;
  const mood = useHeroMood();
  const purse = useCoins(profile.id, world);
  const [reward, setReward] = useState<Collectible | null>(null);
  const seed = useMemo(() => Math.floor(Math.random() * 0x7fffffff), []);
  const [queue, setQueue] = useState(() => battleQuestions(node, seed));
  const [idx, setIdx] = useState(0);
  const [landed, setLanded] = useState(0);
  const [points, setPoints] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [stars, setStars] = useState(0);
  const [message, setMessage] = useState<Message | null>(null);
  const [over, setOver] = useState(false);
  const bossEl = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const later = (f: () => void, ms: number) => timers.current.push(window.setTimeout(f, ms));
  const left = node.hits - landed;
  const q = queue[idx];
  const intro = def?.intro ?? `${name} מבלבל את המספרים – כל תשובה נכונה היא מכה!`;
  const winText = `${byGender(profile, 'ניצחת', 'ניצחת', 'ניצחתם')} את ${name}!`;
  useAutoSpeak(phase === 'intro' ? intro : phase === 'won' ? winText : q.prompt.speech, phase === 'fight' ? q.id : phase);

  useEffect(() => {
    setFxWorld(world.id);
    later(() => emit({ type: 'bossAppear' }, { el: bossEl.current }), 250);
    return () => {
      timers.current.forEach(clearTimeout);
      hushFeedback();
    };
  }, []);

  function right(wrongBefore: number) {
    const n = landed + 1;
    setLanded(n);
    const pts = points + questionPoints(wrongBefore, true);
    setPoints(pts);
    setMessage(msg(n < node.hits ? ['פגיעה!', 'בום!', 'עוד מכה!', 'יופי!'][n % 4] : 'המכה האחרונה!', 'good'));
    emit({ type: 'bossHit', n, left: node.hits - n }, { el: bossEl.current });
    purse.earn(1, bossEl.current);
    const asked = idx + 1;
    if (n >= node.hits) later(() => win(pts, asked), reducedMotion() ? 450 : 900);
    else later(next, reducedMotion() ? 500 : 950);
  }

  function next() {
    setIdx((i) => i + 1);
    setMessage(null);
  }

  /** The answer had to be shown: no hit, and one more question joins the battle. */
  function shown() {
    const skill = node.skillIds[(queue.length + 1) % node.skillIds.length];
    let extra = makeQuestion(skill, node.level, seed + queue.length * 104729);
    for (let t = 1; queue.some((x) => x.key === extra.key) && t < 30; t++) extra = makeQuestion(skill, node.level, seed + queue.length * 104729 + t);
    setQueue((qs) => [...qs, extra]);
  }

  function win(pts: number, asked: number) {
    const s = Math.max(1, starsFor(pts, asked));
    setStars(s);
    setPhase('won');
    setMessage(null);
    void recordNodeStars(profile.id, nodeId, s);
    // The next collectible of this world, if any is left.
    void getInventory(profile.id, world.id).then((inv) => {
      const r = nextReward(world.rewards, inv);
      if (!r) return;
      setReward(r);
      void addItem(profile.id, world.id, r.id);
    });
    emit({ type: 'bossDefeated', stars: s });
    later(() => setOver(true), reducedMotion() ? 400 : 1800);
  }

  function skipParty() {
    if (phase !== 'won' || over) return;
    timers.current.forEach(clearTimeout);
    hushFeedback();
    setHeroMood('happy');
    setOver(true);
  }

  const bar = (
    <div class="boss-hp-row">
      <span class="boss-hp-text" dir="ltr" aria-hidden="true">
        {left}/{node.hits}
      </span>
      <div class="boss-hp" role="meter" aria-label={`הכוח של ${name}`} aria-valuemin={0} aria-valuemax={node.hits} aria-valuenow={left} data-hp={left}>
        <span class="boss-hp-fill" style={`transform:scaleX(${left / node.hits})`} />
      </div>
    </div>
  );

  return (
    <main class={`screen game boss-screen is-${phase}`} data-phase={phase} data-testid="boss" data-boss={def?.id ?? 'muddler'} onClick={skipParty}>
      <header class="topbar game-top">
        <button
          type="button"
          class="icon-btn"
          aria-label="חזרה למפה"
          data-testid="boss-close"
          onClick={() => {
            playSfx('tap');
            onMap();
          }}
        >
          ✕
        </button>
        <h1 class="topbar-title">{name}</h1>
        <CoinChip world={world} coins={purse.coins} chipRef={purse.chip} />
      </header>

      {phase !== 'won' && bar}

      <div class="boss-arena">
        <Hero def={world.hero!} gender={profile.gender} state={mood.state} key={mood.n} class="boss-hero" />
        <div class="boss-spot" ref={bossEl} data-testid="boss-el">
          <Art class="boss-big" state={phase === 'won' ? 'beaten' : 'idle'} />
        </div>
      </div>

      {phase === 'intro' && (
        <section class="boss-intro">
          <p class="boss-intro-text">
            {intro} <SpeakButton text={intro} class="speak-inline" />
          </p>
          <button
            type="button"
            class="btn btn-primary btn-big"
            data-testid="boss-start"
            onClick={() => {
              playSfx('tap');
              setPhase('fight');
            }}
          >
            ⚔️ להילחם!
          </button>
        </section>
      )}

      {phase === 'fight' && (
        <>
          <Ask
            key={q.id}
            question={q}
            mode="bubbles"
            profile={profile}
            onMessage={setMessage}
            onRight={(wrongBefore) => right(wrongBefore)}
            onWrong={() => emit({ type: 'bossDodge' }, { el: bossEl.current })}
            onShown={shown}
            onNext={next}
            onResult={(r) => void recordAnswer(profile.id, q.skillId, r, node.level)}
            nextLabel="הבא ←"
          />
          <div class="speech-bubble boss-bubble">
            <Feedback message={message} idle={byGender(profile, 'בחר תשובה ותקוף!', 'בחרי תשובה ותקפי!', 'בחרו תשובה ותקפו!')} />
          </div>
        </>
      )}

      {phase === 'won' && (
        <section class="boss-won">
          <h2 class="celebrate-title">{winText}</h2>
          <div class="celebrate-stars" role="img" aria-label={`${stars} מתוך 3 כוכבים`}>
            {[1, 2, 3].map((n) => (
              <span key={n} class={`big-star ${n <= stars ? 'is-on' : ''}`}>
                ★
              </span>
            ))}
          </div>
          {reward && (
            <p class="boss-reward" data-testid="boss-reward" data-item={reward.id}>
              <span class="boss-reward-icon" aria-hidden="true">
                {reward.icon}
              </span>{' '}
              קיבלת לאוסף: {reward.name}
            </p>
          )}
          {over ? (
            <button type="button" class="btn btn-primary btn-big" data-testid="boss-to-map" onClick={onMap}>
              🗺️ חזרה למפה
            </button>
          ) : (
            <button type="button" class="btn btn-ghost skip-btn" data-testid="boss-skip">
              {byGender(profile, 'גע', 'געי', 'געו')} כדי לדלג ⏭
            </button>
          )}
        </section>
      )}
    </main>
  );
}
