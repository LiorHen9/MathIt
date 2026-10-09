// The quest map (docs/ARCHITECTURE.md §4.4, §6.1 "journey motion"): the profile's main screen.
// A tall map that scrolls up and down, a winding path (SVG, colours from CSS variables), the
// stations on it – an icon by kind, the stars earned, a lock on the closed ones – and the world's
// hero standing beside the station to play next.
//
// Coming back from a station: the hero walks along the path to the next one (transform only,
// a footstep sound every stride) and every station that opened since the last visit opens in a
// burst of light (particles + the unlock sound). With reduced motion the hero fades across and
// there are no particles, but what opened is still marked ("חדש!" and a ring).
// Tapping an open or done station plays it (App opens the lesson, round, chest or boss); a closed
// one says why ("first …" / "N more stars"). Settings, "who is playing?", free practice (the old
// home screen) and "my collection" stay one tap away. Loaded lazily.
//
// Phase 6 (the mastery engine): when skills are due for review, a review station appears beside
// the hero (made on the fly – core/quest reviewNode – never saved as a station), opening once in
// a burst like any station; a mastered skill wears a small crown on its last practice station.
//
// Phase 7: five chapters. The map shows one chapter at a time (decision: a chapter is at most
// ~17 stations, so the page stays light – instead of one endless scroll), with tabs to look at any
// chapter already open. Roads lead in at the top and out at the bottom: when the next station is
// in the next chapter, the hero walks out of this one, the map turns to the next chapter, and the
// hero walks in to it – then it opens in a burst, with the chapter's story sentence.
//
// The map wears the world's skin (World.mapSkin, phase 5): its ground and scenery (a pitch, a
// garden, a dojo, a cave, a stage…), its station shapes and path, icons on the section banners,
// the world's boss on the boss station, and a one-sentence story for the chapter. The world's
// coins show beside the stars.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Ref } from 'preact';
import { JOURNEY, allNodes, chapterMaxStars, chapterNodes, chapterOf, chapterStars, lockReason, maxStars, nextNode, nodeStars, nodeStatus, reviewNode, reviewSkills, type QuestNode, type ReviewNode } from '../core/quest/index';
import { dueSkills, isMastered } from '../core/mastery/index';
import type { SkillId } from '../core/types';
import { now } from '../app/clock';
import { breakOffered, playClock, playStart } from '../app/playTime';
import { breakDue, goalProgress, goalText } from '../core/parents/goal';
import type { DayLog } from '../core/parents/days';
import type { DailyGoal } from '../core/parents/goal';
import { getDayLog, markGoal } from '../storage/sessions';
import { listSkillStates, type SkillState } from '../storage/skillStates';
import { getSkill } from '../core/skills/index';
import { emit, hushFeedback, setFxWorld } from '../fx/director';
import { Hero, useHeroMood } from '../fx/Hero';
import { hop, reducedMotion } from '../fx/motion';
import { Feedback, NarrationHelp, SpeakButton, useAutoSpeak, type Message } from '../components/Speak';
import { byGender, stageLabel, type Profile } from '../profiles/profiles';
import { getQuestRecord, revealReview, reviewRevealed, saveMapState, type QuestRecord } from '../storage/questProgress';
import { bossOf, useWorld } from '../worlds/index';
import { CoinChip, useCoins } from '../components/Coins';
import { playSfx, type SfxName } from '../audio/sfx';
import { BossArt, ChestArt } from './quest/art';
import { MAP_W, heroSide, heroSpot, mapLayout, type Spot } from './quest/layout';

interface Props {
  profile: Profile;
  onSwitch: () => void;
  onSettings: () => void;
  onPractice: () => void;
  onCollection: () => void;
  /** "My achievements" (phase 10). */
  onAchievements: () => void;
  onNode: (node: QuestNode) => void;
}

/** The hero on the map, in px (its feet are at the bottom centre). */
const HERO_W = 54;
const HERO_H = 72;
/** A footstep every this many ms of walking. */
const STRIDE_MS = 300;

let msgId = 0;
const say = (text: string, tone: Message['tone'] = 'info'): Message => ({ text, tone, id: ++msgId });

/** The review station's size (map units) and how far beside the hero it stands. */
const REVIEW_SIZE = 58;
const REVIEW_GAP = 74;

export function nodeIcon(n: QuestNode): string {
  if (n.kind === 'lesson') return '📖';
  if (n.kind === 'review') return '🔁';
  if (n.kind === 'practice') return getSkill(n.skillId)?.icon ?? '⭐';
  if (n.kind === 'puzzle') return '🧩';
  return n.kind === 'chest' ? '🎁' : '👾';
}

/** The index of the chapter a station is in (0 when unknown). */
const chapterIndex = (id: string | null | undefined) => Math.max(0, JOURNEY.chapters.findIndex((c) => c === chapterOf(id ?? '')));

export function QuestMap({ profile, onSwitch, onSettings, onPractice, onCollection, onAchievements, onNode }: Props) {
  const world = useWorld();
  const mood = useHeroMood();
  const all = useMemo(() => allNodes(), []);
  const [view, setView] = useState<number | null>(null);
  const chapter = JOURNEY.chapters[view ?? 0];
  const layout = useMemo(() => mapLayout({ id: JOURNEY.id, chapters: [chapter] }), [chapter]);
  /** The stations on screen: this chapter's. */
  const nodes = useMemo(() => chapterNodes(chapter), [chapter]);
  /** Section banners count on from the chapters before (their icons go round). */
  const sectionBase = JOURNEY.chapters.slice(0, view ?? 0).reduce((n, c) => n + c.sections.length, 0);
  const [rec, setRec] = useState<QuestRecord | null>(null);
  const [skills, setSkills] = useState<Record<string, SkillState>>({});
  const [reviewFresh, setReviewFresh] = useState(false);
  const reviewRef = useRef<HTMLButtonElement>(null);
  const [heroAt, setHeroAt] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const [walking, setWalking] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  /** Today's practice, for the daily goal a parent set (phase 8). */
  const [today, setToday] = useState<DayLog | null>(null);
  /** A gentle break is offered (a parent set it, and the child has played long enough). */
  const [breakTime, setBreakTime] = useState(false);
  const goalRef = useRef<HTMLSpanElement>(null);
  const goal = profile.parent.goal;
  const [scale, setScale] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLButtonElement>(null);
  const segRefs = useRef<(SVGPathElement | null)[]>([]);
  const entryRef = useRef<SVGPathElement>(null);
  const exitRef = useRef<SVGPathElement>(null);
  /** A walk into the next chapter, waiting for that chapter to be drawn. */
  const arriving = useRef<{ to: string; pending: string[]; reviewNew: boolean } | null>(null);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const timers = useRef<number[]>([]);
  const ran = useRef(false);
  const heroName = world.hero?.name(profile.gender) ?? '';
  const skin = world.mapSkin;
  const story = world.story?.chapters[view ?? 0] ?? null;
  const purse = useCoins(profile.id, world);

  useEffect(() => {
    setFxWorld(world.id);
  }, [world.id]);

  useEffect(() => {
    let alive = true;
    void Promise.all([getQuestRecord(profile.id), listSkillStates(profile.id)]).then(([r, st]) => {
      if (!alive) return;
      setSkills(st);
      setRec(r);
      setHeroAt(r.at ?? all[0].id);
      setView(chapterIndex(r.at ?? all[0].id));
    });
    return () => {
      alive = false;
      timers.current.forEach(clearTimeout);
      hushFeedback();
    };
  }, [profile.id]);

  // The parents' daily goal: today's practice, and a small celebration once a day when it is
  // reached (on the goal meter). And a gentle break, if a parent asked for one.
  useEffect(() => {
    const t = now();
    playStart(profile.id, t);
    const c = playClock();
    setBreakTime(breakDue(profile.parent.breakAfter, c.started, c.offered, t));
    if (!goal) return;
    let alive = true;
    void getDayLog(profile.id, t).then((log) => {
      if (!alive) return;
      setToday(log);
      if (!goalProgress(goal, log).reached || log.goalAt) return;
      void markGoal(profile.id, t).then((l) => alive && setToday(l));
      timers.current.push(
        window.setTimeout(() => {
          // At the speech bubble: the map has scrolled to the hero, the goal meter may be off screen.
          emit({ type: 'goalReached' }, { el: document.querySelector('.map-bubble') ?? goalRef.current });
          setMessage(say('🎯 יש! היעד של היום הושג!', 'good'));
        }, 700)
      );
    });
    return () => {
      alive = false;
    };
  }, [profile.id]);

  // The map is drawn in map units and scaled to the screen's width.
  useLayoutEffect(() => {
    const measure = () => mapRef.current && setScale(mapRef.current.clientWidth / MAP_W);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [rec !== null, view]);

  const status = (n: QuestNode) => (rec ? nodeStatus(n, rec) : 'locked');
  const current = rec ? nextNode(rec) : null;
  // Skills due for review → a review station, beside where the hero will stand.
  const review: ReviewNode | null = useMemo(() => {
    const due = dueSkills(skills, now());
    if (!due.length) return null;
    const played = (Object.values(skills) as SkillState[]).filter((s) => s.attempts > 0).sort((a, b) => b.mastery - a.mastery).map((s) => s.skillId as SkillId);
    return reviewNode(reviewSkills(due, played));
  }, [skills]);
  // The crown: on the last practice station of every mastered skill.
  const crowned = useMemo(() => {
    const out = new Set<string>();
    for (const id of Object.keys(skills)) {
      if (!isMastered(skills[id])) continue;
      const last = all.filter((n) => n.kind === 'practice' && n.skillId === id).at(-1);
      if (last) out.add(last.id);
    }
    return out;
  }, [skills]);
  const spotOf = (id: string | null): Spot => layout.spots.find((s) => s.node.id === id) ?? layout.spots[0];
  const inView = (id: string | null | undefined) => !!id && nodes.some((n) => n.id === id);
  const heroXY = (id: string | null) => {
    const f = heroSpot(spotOf(id));
    return `translate(${(f.x * scale - HERO_W / 2).toFixed(1)}px, ${(f.y * scale - HERO_H).toFixed(1)}px)`;
  };
  /** A station's name on this map: the boss station takes the world's boss's name (stronger every chapter). */
  function titleOf(n: QuestNode): string {
    const b = n.kind === 'boss' ? bossOf(world, n.tier) : undefined;
    return b ? b.name : n.title;
  }
  /** Page scroll that puts a station in the middle of the screen. */
  const scrollTop = (id: string) => {
    const box = mapRef.current?.getBoundingClientRect();
    if (!box) return 0;
    return Math.max(0, box.top + window.scrollY + spotOf(id).y * scale - window.innerHeight * 0.45);
  };
  const later = (f: () => void, ms: number) => timers.current.push(window.setTimeout(f, ms));

  // What the child hears on arriving: what just opened, or where the journey goes on.
  const opened = rec ? all.filter((n) => status(n) !== 'locked' && !rec.revealed.includes(n.id)) : [];
  const newcomer = !!rec && Object.keys(rec.stars).length === 0;
  /** The hero is about to walk into the next chapter: its story is what the child hears. */
  const newChapter = !!rec && !!current && chapterIndex(current.id) > chapterIndex(rec.at ?? all[0].id);
  const greeting = !rec
    ? null
    : newChapter
      ? world.story?.chapters[chapterIndex(current!.id)] ?? `${JOURNEY.chapters[chapterIndex(current!.id)].title}!`
      : opened.length
      ? `נפתחה תחנה חדשה: ${titleOf(opened.at(-1)!)}!`
      : review && !reviewRevealed(rec)
        ? 'נפתחה תחנת חזרה: בואו ניזכר במה שלמדנו!'
      : newcomer && story
        ? story
        : current
        ? `שלום ${profile.name}, ממשיכים במסע!`
        : `${byGender(profile, 'אלוף', 'אלופה', 'אלופים')}! סיימת את כל המסע!`;
  useAutoSpeak(greeting, rec ? 'map' : null);

  /** The bursts for stations that opened (those on screen burst; the rest are just marked). */
  function reveal(pending: string[], reviewNew: boolean) {
    pending.forEach((id, k) =>
      later(() => {
        setFresh((f) => [...f, id]);
        emit({ type: 'unlock' }, { el: nodeRefs.current[id] });
      }, k * 420)
    );
    if (reviewNew)
      later(() => {
        setReviewFresh(true);
        emit({ type: 'unlock' }, { el: reviewRef.current });
      }, pending.length * 420 + 200);
  }

  // Once, when the map is ready: scroll to the hero, walk to the next station (into the next
  // chapter if that is where it is), open what opened.
  useLayoutEffect(() => {
    if (!rec || !scale || view === null || ran.current) return;
    ran.current = true;
    const from = rec.at ?? all[0].id;
    const to = current?.id ?? from;
    const pending = opened.map((n) => n.id);
    const reviewNew = !!review && !reviewRevealed(rec);
    window.scrollTo({ top: scrollTop(from), behavior: 'auto' });
    if (to === from && !pending.length && !reviewNew) return;
    // Saved first: leaving in the middle of the walk does not replay it next time.
    if (to !== from || pending.length) void saveMapState(profile.id, to, pending);
    if (reviewNew) void revealReview(profile.id);
    const fi = nodes.findIndex((n) => n.id === from);
    const ti = nodes.findIndex((n) => n.id === to);
    if (ti < 0 && chapterIndex(to) > (view ?? 0)) {
      // The next station is in a later chapter: out through the bottom road, then the map turns.
      later(
        () =>
          void walkRoute(fi, nodes.length - 1, 'out').then(() => {
            arriving.current = { to, pending, reviewNew };
            setView(chapterIndex(to));
          }),
        reducedMotion() ? 150 : 450
      );
    } else if (ti > fi) later(() => void walkRoute(fi, ti).then(() => reveal(pending, reviewNew)), reducedMotion() ? 150 : 450);
    else {
      setHeroAt(to);
      if (ti < 0) setView(chapterIndex(to));
      later(() => reveal(pending, reviewNew), 300);
    }
  }, [rec, scale, view]);

  // Arriving in the next chapter: in through the top road, on to the station.
  useLayoutEffect(() => {
    const a = arriving.current;
    if (!a || !scale || !inView(a.to)) return;
    arriving.current = null;
    // The hero waits, unseen, at the gate (it fades in as it walks down the road).
    setWalking(true);
    window.scrollTo({ top: 0, behavior: 'auto' });
    const ti = nodes.findIndex((n) => n.id === a.to);
    later(() => void walkRoute(-1, ti, 'in').then(() => reveal(a.pending, a.reviewNew)), reducedMotion() ? 150 : 350);
  }, [view, scale]);

  /** Points along a drawn path (map units), shifted from beside station a to beside station b. */
  function along(path: SVGPathElement | null, a: { x: number; y: number }, b: { x: number; y: number }, oa: { x: number; y: number }, ob: { x: number; y: number }, first: boolean) {
    const L = path?.getTotalLength() ?? Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(6, Math.round(L / 12));
    const pts: { x: number; y: number }[] = [];
    for (let s = first ? 0 : 1; s <= n; s++) {
      const t = s / n;
      const p = path ? path.getPointAtLength(L * t) : { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      pts.push({ x: p.x + (oa.x - a.x) * (1 - t) + (ob.x - b.x) * t, y: p.y + (oa.y - a.y) * (1 - t) + (ob.y - b.y) * t });
    }
    return { pts, L };
  }

  /**
   * The hero walks along the path from station `fi` to station `ti` of this chapter; `out` goes on
   * along the road out at the bottom (fi to the edge), `in` starts at the top edge (fi = −1).
   */
  async function walkRoute(fi: number, ti: number, road?: 'in' | 'out'): Promise<void> {
    const hero = heroRef.current;
    const toId = road === 'out' ? null : nodes[ti]?.id;
    if (!hero) {
      if (toId) setHeroAt(toId);
      return;
    }
    setWalking(true);
    const fast = reducedMotion();
    const endY = road === 'out' ? layout.gateOut.y : spotOf(toId!).y;
    window.scrollTo({ top: Math.max(0, (mapRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY + endY * scale - window.innerHeight * 0.45), behavior: fast ? 'auto' : 'smooth' });
    const px = (p: { x: number; y: number }) => `translate(${(p.x * scale - HERO_W / 2).toFixed(1)}px, ${(p.y * scale - HERO_H).toFixed(1)}px)`;
    if (fast) {
      // Reduced motion: no stroll – a short fade out here and in there.
      emit({ type: 'walk', steps: 0, ms: 300 });
      await hero.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }).finished.catch(() => {});
      if (toId) {
        hero.style.transform = heroXY(toId);
        setHeroAt(toId);
      }
      await hero.animate([{ opacity: 0 }, { opacity: road === 'out' ? 0 : 1 }], { duration: 150, fill: road === 'out' ? 'forwards' : 'none' }).finished.catch(() => {});
      if (road !== 'out') hero.getAnimations().forEach((x) => x.cancel());
      setWalking(false);
      return;
    }
    const pts: { x: number; y: number }[] = [];
    let length = 0;
    if (road === 'in') {
      const b = layout.spots[0];
      const r = along(entryRef.current, layout.gateIn, b, layout.gateIn, heroSpot(b), true);
      pts.push(...r.pts);
      length += r.L;
    }
    for (let k = Math.max(0, fi); k < ti; k++) {
      const a = layout.spots[k];
      const b = layout.spots[k + 1];
      const r = along(segRefs.current[k], a, b, heroSpot(a), heroSpot(b), pts.length === 0);
      pts.push(...r.pts);
      length += r.L;
    }
    if (road === 'out') {
      const a = layout.spots.at(-1)!;
      const r = along(exitRef.current, a, layout.gateOut, heroSpot(a), layout.gateOut, pts.length === 0);
      pts.push(...r.pts);
      length += r.L;
    }
    if (pts.length < 2) {
      setWalking(false);
      return;
    }
    const ms = Math.round(Math.min(3400, Math.max(1400, length * 6)));
    const steps = Math.max(2, Math.round(ms / STRIDE_MS));
    emit({ type: 'walk', steps, ms });
    for (let s = 1; s < steps; s++) later(() => emit({ type: 'step', n: s }), s * STRIDE_MS);
    const frames: Keyframe[] = pts.map((p, i) => ({ transform: px(p), offset: i / (pts.length - 1) }));
    if (road === 'in') frames[0].opacity = 0;
    if (road === 'in') frames[1].opacity = 1;
    if (road === 'out') frames.at(-1)!.opacity = 0;
    const anim = hero.animate(frames, { duration: ms, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' });
    await anim.finished.catch(() => {});
    if (toId) {
      hero.style.transform = heroXY(toId);
      setHeroAt(toId);
      anim.cancel();
    }
    setWalking(false);
  }

  function tapNode(n: QuestNode) {
    if (!rec) return;
    if (n.kind === 'review') {
      playSfx('tap');
      onNode(n);
      return;
    }
    const st = status(n);
    if (st === 'locked') {
      const why = lockReason(n, rec);
      const text = why?.before
        ? `עוד לא! קודם: ${titleOf(why.before)}`
        : `צריך עוד ${why?.stars} ${why?.stars === 1 ? 'כוכב' : 'כוכבים'} כדי לפתוח`;
      setMessage(say(why?.stars && !why.before ? `${text} ⭐` : text));
      emit({ type: 'locked' }, { el: nodeRefs.current[n.id] });
      return;
    }
    if (n.kind === 'chest' && st === 'done') {
      playSfx('tap');
      setMessage(say(`כבר ${byGender(profile, 'פתחת', 'פתחת', 'פתחתם')} את התיבה ${rec.chests[n.id] ?? ''}`, 'good'));
      return;
    }
    playSfx('tap');
    onNode(n);
  }

  if (!rec) return <main class="screen loading" aria-busy="true" />;

  const stars = chapterStars(chapter, rec);
  // The review station stands beside the hero, on the side away from the station.
  const reviewSpot = (() => {
    if (!review || !inView(current?.id ?? nodes.at(-1)!.id)) return null;
    const s = spotOf(current?.id ?? nodes.at(-1)!.id);
    const h = heroSpot(s);
    const x = Math.max(REVIEW_SIZE / 2 + 8, Math.min(MAP_W - REVIEW_SIZE / 2 - 8, h.x + heroSide(s) * REVIEW_GAP));
    return { x, y: s.y };
  })();
  const nextTitle = current ? titleOf(current) : '';
  const idle = current ? byGender(profile, `גע בתחנה הבאה: ${nextTitle}`, `געי בתחנה הבאה: ${nextTitle}`, `געו בתחנה הבאה: ${nextTitle}`) : 'כל התחנות הושלמו! 🏆';
  return (
    <main class="screen quest-map" data-current={current?.id ?? ''} data-review={review ? review.skillIds.join(',') : ''} data-walking={walking ? 'yes' : 'no'} data-world={world.id}>
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

      {breakTime && (
        <section class="card map-break enter" data-testid="break-card" role="status">
          <p class="map-break-text">
            🧃 {BREAK_SAY} <SpeakButton text={BREAK_SAY} class="speak-inline" />
          </p>
          <div class="row">
            <button
              type="button"
              class="btn btn-secondary"
              data-testid="break-more"
              onClick={() => {
                playSfx('tap');
                breakOffered(now());
                setBreakTime(false);
              }}
            >
              עוד קצת
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              data-testid="break-stop"
              onClick={() => {
                playSfx('tap');
                breakOffered(now());
                onSwitch();
              }}
            >
              👋 הפסקה
            </button>
          </div>
        </section>
      )}

      <section class="map-hello enter">
        <h1 class="home-title">
          <span class="avatar avatar-md" aria-hidden="true">
            {profile.avatar}
          </span>{' '}
          שלום {profile.name}!
        </h1>
        <p class="home-sub">
          {world.icon} {world.name} · {stageLabel(profile)}
        </p>
        <p class="map-with">
          יוצאים למסע עם <span class="home-hero-name">{heroName}</span> {greeting && <SpeakButton text={greeting} class="speak-inline" />}
        </p>
        <div class="map-chips">
          <span class="chip map-stars" data-testid="chapter-stars" aria-label={`${stars} כוכבים בפרק מתוך ${chapterMaxStars(chapter)}`}>
            ⭐ <span dir="ltr">{stars}/{chapterMaxStars(chapter)}</span>
          </span>
          <CoinChip world={world} coins={purse.coins} chipRef={purse.chip} class="map-stars" />
          {goal && today && <GoalChip goal={goal} today={today} chipRef={goalRef} />}
          <button
            type="button"
            class="btn btn-secondary map-practice"
            data-testid="open-practice"
            onClick={() => {
              playSfx('tap');
              onPractice();
            }}
          >
            🎯 תרגול חופשי
          </button>
          <button
            type="button"
            class="btn btn-secondary map-practice"
            data-testid="open-collection"
            onClick={() => {
              playSfx('tap');
              onCollection();
            }}
          >
            🎒 האוסף שלי
          </button>
          <button
            type="button"
            class="btn btn-secondary map-practice"
            data-testid="open-achievements"
            onClick={() => {
              playSfx('tap');
              onAchievements();
            }}
          >
            🏅 ההישגים שלי
          </button>
        </div>
      </section>

      <nav class="map-chapters" aria-label="פרקים" data-testid="chapter-tabs">
        {JOURNEY.chapters.map((c, k) => {
          const first = chapterNodes(c)[0];
          const shut = status(first) === 'locked' && !rec.revealed.includes(first.id);
          return (
            <button
              type="button"
              key={c.id}
              class={`chip map-chapter-tab ${k === view ? 'is-now' : ''} ${shut ? 'is-locked' : ''}`}
              data-testid={`chapter-tab-${k + 1}`}
              aria-label={`${c.title}${shut ? ' – סגור' : ''}`}
              aria-current={k === view ? 'page' : undefined}
              disabled={walking}
              onClick={() => {
                if (shut) {
                  setMessage(say(`עוד לא! ${c.title} נפתח אחרי ${titleOf(chapterNodes(JOURNEY.chapters[k - 1]).at(-1)!)}`));
                  emit({ type: 'locked' });
                  return;
                }
                playSfx('tap');
                setFresh([]);
                setView(k);
                window.scrollTo({ top: 0, behavior: 'auto' });
              }}
            >
              {shut ? '🔒' : k + 1}
            </button>
          );
        })}
      </nav>
      <h2 class="map-chapter" data-testid="map-chapter" data-chapter={chapter.id}>
        {chapter.title}
      </h2>
      {story && (
        <p class="map-story" data-testid="map-story">
          {story} <SpeakButton text={story} class="speak-inline" />
        </p>
      )}

      <div
        class={`map node-${skin?.node ?? 'round'} path-${skin?.path ?? 'plain'}`}
        data-skin={world.id}
        ref={mapRef}
        style={{ aspectRatio: `${MAP_W} / ${layout.height}` }}
      >
        {skin && (
          <svg class="map-scenery" data-testid="map-scenery" viewBox={`0 0 ${MAP_W} ${layout.height}`} aria-hidden="true">
            <skin.Scenery width={MAP_W} height={layout.height} />
          </svg>
        )}
        <svg class="map-path" viewBox={`0 0 ${MAP_W} ${layout.height}`} aria-hidden="true">
          {(view ?? 0) > 0 && (
            <g>
              <path class="map-road" d={layout.entry} />
              <path class="map-trail is-lit" d={layout.entry} ref={entryRef} />
            </g>
          )}
          {(view ?? 0) < JOURNEY.chapters.length - 1 && (
            <g>
              <path class="map-road" d={layout.exit} />
              <path class={`map-trail ${status(chapterNodes(JOURNEY.chapters[(view ?? 0) + 1])[0]) !== 'locked' ? 'is-lit' : ''}`} d={layout.exit} ref={exitRef} />
            </g>
          )}
          {layout.segments.map((d, k) => {
            const target = layout.spots[k + 1].node;
            const lit = status(target) !== 'locked' && (rec.revealed.includes(target.id) || fresh.includes(target.id));
            return (
              <g key={k}>
                <path class="map-road" d={d} />
                <path class={`map-trail ${lit ? 'is-lit' : ''}`} d={d} ref={(el) => void (segRefs.current[k] = el)} />
              </g>
            );
          })}
        </svg>

        {layout.banners.map((b, i) => (
          <p key={b.id} class="map-section" style={{ top: `${(b.y / layout.height) * 100}%` }}>
            {skin && <span aria-hidden="true">{skin.sectionIcons[(sectionBase + i) % skin.sectionIcons.length]} </span>}
            {b.title}
          </p>
        ))}

        {layout.spots.map((s) => {
          const n = s.node;
          // A station whose opening has not been shown yet still looks closed until its burst.
          const real = status(n);
          const st = real === 'open' && !rec.revealed.includes(n.id) && !fresh.includes(n.id) ? 'locked' : real;
          const got = nodeStars(n, rec);
          const max = maxStars(n);
          const isNow = current?.id === n.id && st === 'open';
          const isNew = fresh.includes(n.id);
          const what = st === 'locked' ? 'סגור' : st === 'done' ? (max ? `${got} מתוך ${max} כוכבים` : 'נפתחה') : 'פתוח';
          return (
            <div
              key={n.id}
              class={`map-spot k-${n.kind} is-${st} ${isNow ? 'is-current' : ''} ${isNew ? 'is-new' : ''}`}
              style={`left:${(s.x / MAP_W) * 100}%;top:${(s.y / layout.height) * 100}%;--size:${s.size}px`}
            >
              <button
                type="button"
                class="map-node"
                ref={(el) => void (nodeRefs.current[n.id] = el)}
                data-node={n.id}
                data-kind={n.kind}
                data-status={st}
                data-stars={got}
                data-mastered={crowned.has(n.id) ? 'yes' : 'no'}
                aria-label={`${titleOf(n)} – ${what}${crowned.has(n.id) ? ' – נשלט' : ''}`}
                onClick={() => tapNode(n)}
              >
                {n.kind === 'boss' ? (
                  (() => {
                    const b = bossOf(world, n.tier);
                    return b ? <b.Art class={`map-art boss-tier-${n.tier}`} /> : <BossArt class="map-art" />;
                  })()
                ) : n.kind === 'chest' ? (
                  st === 'done' ? (
                    <span class="map-icon">{rec.chests[n.id]}</span>
                  ) : (
                    <ChestArt class="map-art" />
                  )
                ) : (
                  <span class="map-icon" aria-hidden="true">
                    {nodeIcon(n)}
                  </span>
                )}
                {st === 'locked' && (
                  <span class="map-lock" aria-hidden="true">
                    🔒
                  </span>
                )}
              </button>
              {isNew && (
                <span class="map-new" aria-hidden="true">
                  חדש!
                </span>
              )}
              {crowned.has(n.id) && (
                <span class="map-crown" data-testid="map-crown" aria-hidden="true">
                  👑
                </span>
              )}
              {max > 0 && (
                <span class="map-stars-row" aria-hidden="true">
                  {Array.from({ length: max }, (_, k) => (
                    <span key={k} class={k < got ? 'is-on' : ''}>
                      ★
                    </span>
                  ))}
                </span>
              )}
              <span class="map-label">{titleOf(n)}</span>
            </div>
          );
        })}

        {review && reviewSpot && (
          <div
            class={`map-spot k-review is-open ${reviewFresh ? 'is-new' : ''}`}
            style={`left:${(reviewSpot.x / MAP_W) * 100}%;top:${(reviewSpot.y / layout.height) * 100}%;--size:${REVIEW_SIZE}px`}
          >
            <button
              type="button"
              class="map-node"
              ref={reviewRef}
              data-node={review.id}
              data-kind="review"
              data-status="open"
              data-testid="review-node"
              aria-label={`חזרה: ${review.skillIds.map((id) => getSkill(id)?.title ?? id).join(', ')}`}
              onClick={() => tapNode(review)}
            >
              <span class="map-icon" aria-hidden="true">
                {world.icon}
              </span>
              <span class="map-review-badge" aria-hidden="true">
                🔁
              </span>
            </button>
            {reviewFresh && (
              <span class="map-new" aria-hidden="true">
                חדש!
              </span>
            )}
            <span class="map-label">חזרה</span>
          </div>
        )}

        {world.hero && scale > 0 && (inView(heroAt) || walking) && (
          <button
            ref={heroRef}
            type="button"
            class="map-hero"
            data-testid="home-hero"
            data-at={heroAt ?? ''}
            aria-label={`${heroName} – לחיצה להגיד שלום`}
            style={{ transform: heroXY(heroAt), width: `${HERO_W}px`, height: `${HERO_H}px`, opacity: inView(heroAt) ? 1 : 0 }}
            onClick={() => {
              playSfx(`world-${world.id}` as SfxName);
              hop(heroRef.current?.querySelector('.hero'));
            }}
          >
            <Hero def={world.hero} gender={profile.gender} state={mood.state} key={mood.n} />
          </button>
        )}
      </div>

      <div class="map-dock">
        <div class="speech-bubble map-bubble">
          <Feedback message={message} idle={idle} />
        </div>
        {current && (
          <button type="button" class="btn btn-primary map-go" data-testid="map-go" aria-label={`המשך: ${current.title}`} onClick={() => tapNode(current)}>
            ▶ קדימה
          </button>
        )}
      </div>

      <NarrationHelp />
    </main>
  );
}

/** The break offer: one sentence, the same for every child. */
const BREAK_SAY = 'שיחקנו יפה! אולי הפסקה קטנה?';

/** Today toward the goal a parent set: a small bar that grows by transform, and the numbers. */
function GoalChip({ goal, today, chipRef }: { goal: DailyGoal; today: DayLog; chipRef: Ref<HTMLSpanElement> }) {
  const g = goalProgress(goal, today);
  return (
    <span
      ref={chipRef}
      class={`chip map-goal ${g.reached ? 'is-reached' : ''}`}
      data-testid="goal-meter"
      data-done={g.done}
      data-target={g.target}
      data-reached={g.reached ? 'yes' : 'no'}
      role="meter"
      aria-label={`היעד של היום: ${goalText(goal)}`}
      aria-valuemin={0}
      aria-valuemax={g.target}
      aria-valuenow={Math.min(g.done, g.target)}
    >
      <span aria-hidden="true">{g.reached ? '🏆' : '🎯'}</span>
      <span class="map-goal-bar" aria-hidden="true">
        <span class="map-goal-fill" style={`transform:scaleX(${g.ratio.toFixed(3)})`} />
      </span>
      <span dir="ltr">
        {Math.min(g.done, g.target)}/{g.target}
      </span>
    </span>
  );
}
