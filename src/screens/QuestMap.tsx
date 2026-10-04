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
// one says why ("first …" / "N more stars"). Settings, "who is playing?" and free practice (the old
// home screen) stay one tap away. Loaded lazily.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { JOURNEY, allNodes, chapterMaxStars, chapterStars, lockReason, maxStars, nextNode, nodeStars, nodeStatus, type QuestNode } from '../core/quest/index';
import { getSkill } from '../core/skills/index';
import { emit, hushFeedback, setFxWorld } from '../fx/director';
import { Hero, useHeroMood } from '../fx/Hero';
import { hop, reducedMotion } from '../fx/motion';
import { Feedback, NarrationHelp, SpeakButton, useAutoSpeak, type Message } from '../components/Speak';
import { byGender, stageLabel, type Profile } from '../profiles/profiles';
import { getQuestRecord, saveMapState, type QuestRecord } from '../storage/questProgress';
import { useWorld } from '../worlds/index';
import { playSfx, type SfxName } from '../audio/sfx';
import { BossArt, ChestArt } from './quest/art';
import { MAP_W, heroSpot, mapLayout, type Spot } from './quest/layout';

interface Props {
  profile: Profile;
  onSwitch: () => void;
  onSettings: () => void;
  onPractice: () => void;
  onNode: (node: QuestNode) => void;
}

/** The hero on the map, in px (its feet are at the bottom centre). */
const HERO_W = 54;
const HERO_H = 72;
/** A footstep every this many ms of walking. */
const STRIDE_MS = 300;

let msgId = 0;
const say = (text: string, tone: Message['tone'] = 'info'): Message => ({ text, tone, id: ++msgId });

export function nodeIcon(n: QuestNode): string {
  if (n.kind === 'lesson') return '📖';
  if (n.kind === 'practice') return getSkill(n.skillId)?.icon ?? '⭐';
  return n.kind === 'chest' ? '🎁' : '👾';
}

export function QuestMap({ profile, onSwitch, onSettings, onPractice, onNode }: Props) {
  const world = useWorld();
  const mood = useHeroMood();
  const layout = useMemo(() => mapLayout(JOURNEY), []);
  const nodes = useMemo(() => allNodes(), []);
  const chapter = JOURNEY.chapters[0];
  const [rec, setRec] = useState<QuestRecord | null>(null);
  const [heroAt, setHeroAt] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const [walking, setWalking] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [scale, setScale] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLButtonElement>(null);
  const segRefs = useRef<(SVGPathElement | null)[]>([]);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const timers = useRef<number[]>([]);
  const ran = useRef(false);
  const heroName = world.hero?.name(profile.gender) ?? '';

  useEffect(() => {
    setFxWorld(world.id);
  }, [world.id]);

  useEffect(() => {
    let alive = true;
    void getQuestRecord(profile.id).then((r) => {
      if (!alive) return;
      setRec(r);
      setHeroAt(r.at ?? nodes[0].id);
    });
    return () => {
      alive = false;
      timers.current.forEach(clearTimeout);
      hushFeedback();
    };
  }, [profile.id]);

  // The map is drawn in map units and scaled to the screen's width.
  useLayoutEffect(() => {
    const measure = () => mapRef.current && setScale(mapRef.current.clientWidth / MAP_W);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [rec !== null]);

  const status = (n: QuestNode) => (rec ? nodeStatus(n, rec) : 'locked');
  const current = rec ? nextNode(rec) : null;
  const spotOf = (id: string | null): Spot => layout.spots.find((s) => s.node.id === id) ?? layout.spots[0];
  const heroXY = (id: string | null) => {
    const f = heroSpot(spotOf(id));
    return `translate(${(f.x * scale - HERO_W / 2).toFixed(1)}px, ${(f.y * scale - HERO_H).toFixed(1)}px)`;
  };
  /** Page scroll that puts a station in the middle of the screen. */
  const scrollTop = (id: string) => {
    const box = mapRef.current?.getBoundingClientRect();
    if (!box) return 0;
    return Math.max(0, box.top + window.scrollY + spotOf(id).y * scale - window.innerHeight * 0.45);
  };
  const later = (f: () => void, ms: number) => timers.current.push(window.setTimeout(f, ms));

  // What the child hears on arriving: what just opened, or where the journey goes on.
  const opened = rec ? nodes.filter((n) => status(n) !== 'locked' && !rec.revealed.includes(n.id)) : [];
  const greeting = !rec
    ? null
    : opened.length
      ? `נפתחה תחנה חדשה: ${opened.at(-1)!.title}!`
      : current
        ? `שלום ${profile.name}, ממשיכים במסע!`
        : `${byGender(profile, 'אלוף', 'אלופה', 'אלופים')}! סיימת את כל הפרק!`;
  useAutoSpeak(greeting, rec ? 'map' : null);

  // Once, when the map is ready: scroll to the hero, walk to the next station, open what opened.
  useLayoutEffect(() => {
    if (!rec || !scale || ran.current) return;
    ran.current = true;
    const from = rec.at ?? nodes[0].id;
    const to = current?.id ?? from;
    const pending = opened.map((n) => n.id);
    window.scrollTo({ top: scrollTop(from), behavior: 'auto' });
    if (to === from && !pending.length) return;
    // Saved first: leaving in the middle of the walk does not replay it next time.
    void saveMapState(profile.id, to, pending);
    const fi = nodes.findIndex((n) => n.id === from);
    const ti = nodes.findIndex((n) => n.id === to);
    const reveal = () => {
      pending.forEach((id, k) =>
        later(() => {
          setFresh((f) => [...f, id]);
          emit({ type: 'unlock' }, { el: nodeRefs.current[id] });
        }, k * 420)
      );
    };
    if (ti > fi) later(() => void walk(fi, ti).then(reveal), reducedMotion() ? 150 : 450);
    else {
      setHeroAt(to);
      later(reveal, 300);
    }
  }, [rec, scale]);

  /** The hero walks from station `fi` to station `ti` along the path. */
  async function walk(fi: number, ti: number): Promise<void> {
    const hero = heroRef.current;
    const to = nodes[ti].id;
    if (!hero) {
      setHeroAt(to);
      return;
    }
    setWalking(true);
    const fast = reducedMotion();
    window.scrollTo({ top: scrollTop(to), behavior: fast ? 'auto' : 'smooth' });
    if (fast) {
      // Reduced motion: no stroll – a short fade out here and in there.
      emit({ type: 'walk', steps: 0, ms: 300 });
      await hero.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }).finished.catch(() => {});
      hero.style.transform = heroXY(to);
      setHeroAt(to);
      await hero.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 }).finished.catch(() => {});
      hero.getAnimations().forEach((a) => a.cancel());
      setWalking(false);
      return;
    }
    // Points along the drawn path, shifted beside the stations where the hero stands.
    const pts: { x: number; y: number }[] = [];
    let length = 0;
    for (let k = fi; k < ti; k++) {
      const path = segRefs.current[k];
      const a = layout.spots[k];
      const b = layout.spots[k + 1];
      const oa = heroSpot(a);
      const ob = heroSpot(b);
      const L = path?.getTotalLength() ?? Math.hypot(b.x - a.x, b.y - a.y);
      length += L;
      const n = Math.max(6, Math.round(L / 12));
      for (let s = k === fi ? 0 : 1; s <= n; s++) {
        const t = s / n;
        const p = path ? path.getPointAtLength(L * t) : { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        pts.push({ x: p.x + (oa.x - a.x) * (1 - t) + (ob.x - b.x) * t, y: p.y + (oa.y - a.y) * (1 - t) + (ob.y - b.y) * t });
      }
    }
    const ms = Math.round(Math.min(3400, Math.max(1400, length * 6)));
    const steps = Math.max(2, Math.round(ms / STRIDE_MS));
    emit({ type: 'walk', steps, ms });
    for (let s = 1; s < steps; s++) later(() => emit({ type: 'step', n: s }), s * STRIDE_MS);
    const frames = pts.map((p, i) => ({
      transform: `translate(${(p.x * scale - HERO_W / 2).toFixed(1)}px, ${(p.y * scale - HERO_H).toFixed(1)}px)`,
      offset: i / (pts.length - 1)
    }));
    const anim = hero.animate(frames, { duration: ms, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' });
    await anim.finished.catch(() => {});
    hero.style.transform = heroXY(to);
    setHeroAt(to);
    anim.cancel();
    setWalking(false);
  }

  function tapNode(n: QuestNode) {
    if (!rec) return;
    const st = status(n);
    if (st === 'locked') {
      const why = lockReason(n, rec);
      const text = why?.before
        ? `עוד לא! קודם: ${why.before.title}`
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
  const idle = current ? byGender(profile, `גע בתחנה הבאה: ${current.title}`, `געי בתחנה הבאה: ${current.title}`, `געו בתחנה הבאה: ${current.title}`) : 'כל התחנות הושלמו! 🏆';
  return (
    <main class="screen quest-map" data-current={current?.id ?? ''} data-walking={walking ? 'yes' : 'no'}>
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
        </div>
      </section>

      <h2 class="map-chapter">{chapter.title}</h2>

      <div class="map" ref={mapRef} style={{ aspectRatio: `${MAP_W} / ${layout.height}` }}>
        <svg class="map-path" viewBox={`0 0 ${MAP_W} ${layout.height}`} aria-hidden="true">
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

        {layout.banners.map((b) => (
          <p key={b.id} class="map-section" style={{ top: `${(b.y / layout.height) * 100}%` }}>
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
                aria-label={`${n.title} – ${what}`}
                onClick={() => tapNode(n)}
              >
                {n.kind === 'boss' ? (
                  <BossArt class="map-art" />
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
              {max > 0 && (
                <span class="map-stars-row" aria-hidden="true">
                  {Array.from({ length: max }, (_, k) => (
                    <span key={k} class={k < got ? 'is-on' : ''}>
                      ★
                    </span>
                  ))}
                </span>
              )}
              <span class="map-label">{n.title}</span>
            </div>
          );
        })}

        {world.hero && scale > 0 && (
          <button
            ref={heroRef}
            type="button"
            class="map-hero"
            data-testid="home-hero"
            data-at={heroAt ?? ''}
            aria-label={`${heroName} – לחיצה להגיד שלום`}
            style={{ transform: heroXY(heroAt), width: `${HERO_W}px`, height: `${HERO_H}px` }}
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
