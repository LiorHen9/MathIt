// The whole app is a small state machine: one screen at a time, no router (as in ChessIt).
// loading → splash → "who is playing?" (or straight to a new profile the first time)
//   → [PIN] → the quest map (the profile's main screen, phase 4) ⇄ settings / editing;
//   map ⇄ a station (lesson, practice round, chest, boss; phase 9 a puzzle) – back to the map, where the hero walks on;
//   map ⇄ free practice (the old home) ⇄ a round / a lesson → (practice);
//   map ⇄ "my collection" (coins and collectibles of every world, phase 5);
//   map ⇄ a review station (made on the fly from skills due for review, phase 6);
//   a new profile (if asked) or settings → the placement game → the map (phase 6);
//   "who is playing?" or settings → the parents' door → the parents' area → back where it came from (phase 8);
//   the parents' area ⇄ a child's dashboard → "practise this" / a lesson in that child's world → their map.
// Shared screens (splash, "who is playing?", PIN) use the base look and default settings; a
// profile's own screens use its world and its settings (applyWorld + activateProfile).
// Music (audio/music.ts) plays the world's loop on the profile's own screens only; lessons are
// quiet (the child listens to the explanation), and so are the shared screens and the editor.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { deviceId, requestPersistence } from '../storage/db';
import { applyWorld } from '../worlds/index';
import { stopSpeaking } from '../audio/speech';
import { setMusicScene } from '../audio/music';
import { Splash } from '../screens/Splash';
import { hasPin } from '../profiles/pin';
import { deleteProfile, getLastProfileId, listProfiles, saveProfile, setLastProfileId, type Profile } from '../profiles/profiles';
import { activateProfile, activeProfile, useActiveProfile } from '../profiles/settings';
import type { ErrorTag, SkillId, TemplateId } from '../core/types';
import type { QuestNode } from '../core/quest/types';
import { lazy, type LazyScreen } from './lazy';
import { logError } from './errorLog';
import { PROGRESS_EVENT } from '../storage/changes';
import { appUpdates } from './updates';
import type { AchievementId } from '../core/achievements/ids';

// Not needed for the first screen: separate chunks (see lazy.tsx).
const ProfilePicker = lazy(() => import('../screens/ProfilePicker').then((m) => m.ProfilePicker));
const ProfileEditor = lazy(() => import('../screens/ProfileEditor').then((m) => m.ProfileEditor));
const PinScreen = lazy(() => import('../screens/PinScreen').then((m) => m.PinScreen));
// The quest map, and free practice one tap away from it.
const QuestMap = lazy(() => import('../screens/QuestMap').then((m) => m.QuestMap));
const Home = lazy(() => import('../screens/Home').then((m) => m.Home));
// Map stations of their own.
const Chest = lazy(() => import('../screens/Chest').then((m) => m.Chest));
const Boss = lazy(() => import('../screens/Boss').then((m) => m.Boss));
// Puzzle stations (phase 9): the host, and each kind of puzzle its own chunk behind it.
const PuzzleHost = lazy(() => import('../screens/PuzzleHost').then((m) => m.PuzzleHost));
const SettingsScreen = lazy(() => import('../screens/SettingsScreen').then((m) => m.SettingsScreen));
const Collection = lazy(() => import('../screens/Collection').then((m) => m.Collection));
// The end of a chapter, and of the whole journey with its certificate (phase 10).
const ChapterEnd = lazy(() => import('../screens/ChapterEnd').then((m) => m.ChapterEnd));
const Finale = lazy(() => import('../screens/Finale').then((m) => m.Finale));
// About and privacy (phase 10), from the settings and the parents' area.
const About = lazy(() => import('../screens/About').then((m) => m.About));
// Achievements (phase 10): the screen, and the badge that drops in when one opens.
const Achievements = lazy(() => import('../screens/Achievements').then((m) => m.Achievements));
const AchievementToast = lazy(() => import('../screens/AchievementToast').then((m) => m.AchievementToast));
// The game brings the generators and the feedback engine with it.
const GameHost = lazy(() => import('../screens/GameHost').then((m) => m.GameHost));
// A lesson brings the teaching animations (shared with the game).
const Lesson = lazy(() => import('../screens/Lesson').then((m) => m.Lesson));
// The placement game (with the game's parts).
const Placement = lazy(() => import('../screens/Placement').then((m) => m.Placement));
// The parents' area (phase 8): a door for adults, then the parents' own screens.
const ParentGate = lazy(() => import('../screens/ParentGate').then((m) => m.ParentGate));
const ParentHome = lazy(() => import('../screens/ParentHome').then((m) => m.ParentHome));
const ParentDashboard = lazy(() => import('../screens/ParentDashboard').then((m) => m.ParentDashboard));

/** Where "back" from the editor goes. */
type EditFrom = 'profiles' | 'settings' | 'first';
/** Where a round or a lesson goes back to: the map (a station) or free practice. */
type From = 'map' | 'practice';
/** Where the parents' area was opened from, and where "exit" goes back to. */
type ParentFrom = 'profiles' | 'settings' | 'first';
const PARENT_EXIT: Record<ParentFrom, string> = { profiles: 'למי משחק?', settings: 'להגדרות', first: 'חזרה' };

type Screen =
  | { name: 'loading' }
  | { name: 'splash' }
  | { name: 'profiles' }
  | { name: 'edit'; profile?: Profile; from: EditFrom }
  | { name: 'pin'; profile: Profile; then: 'home' | 'edit' }
  | { name: 'map' }
  | { name: 'practice' }
  | { name: 'settings' }
  | { name: 'game'; skillId: SkillId; from: From; quest?: { nodeId: string; level: number; template?: TemplateId }; focus?: ErrorTag }
  | { name: 'review'; skillIds: SkillId[]; count: number }
  | { name: 'placement' }
  | { name: 'lesson'; skillId: SkillId; from: From; nodeId?: string }
  | { name: 'chest'; nodeId: string }
  | { name: 'boss'; nodeId: string }
  | { name: 'puzzle'; nodeId: string }
  | { name: 'collection' }
  | { name: 'achievements' }
  | { name: 'chapterEnd'; nodeId: string }
  | { name: 'finale'; replay?: boolean }
  | { name: 'about'; back: Screen; backLabel: string }
  | { name: 'parentGate'; from: ParentFrom }
  | { name: 'parentHome'; from: ParentFrom }
  | { name: 'parentKid'; from: ParentFrom; profileId: string };

/** The parents' screens: the neutral base look, whoever's profile is open behind them. */
const PARENT_SCREENS: Screen['name'][] = ['parentGate', 'parentHome', 'parentKid'];

/** Screens with the world's music (the rest are quiet). */
const MUSIC_SCREENS: Screen['name'][] = ['map', 'practice', 'game', 'review', 'placement', 'chest', 'boss', 'puzzle', 'collection', 'achievements', 'chapterEnd', 'finale', 'settings'];

/**
 * How deep each screen is, for the direction of the move between screens (phase 10): going deeper
 * (map → a station → the chapter's end) is "forward", coming back up is "back". See ARCHITECTURE §6.7.
 */
const DEPTH: Record<Screen['name'], number> = {
  loading: 0,
  splash: 0,
  profiles: 1,
  pin: 2,
  edit: 2,
  map: 3,
  practice: 4,
  settings: 4,
  collection: 4,
  achievements: 4,
  game: 5,
  review: 5,
  lesson: 5,
  chest: 5,
  boss: 5,
  puzzle: 5,
  placement: 5,
  chapterEnd: 6,
  finale: 7,
  about: 8,
  parentGate: 5,
  parentHome: 6,
  parentKid: 7
};

/** The lazy screen each screen shows, loaded before moving to it (no blank flash). */
const CHUNKS: Partial<Record<Screen['name'], Pick<LazyScreen<object>, 'preload' | 'loaded'>>> = {
  profiles: ProfilePicker,
  edit: ProfileEditor,
  pin: PinScreen,
  map: QuestMap,
  practice: Home,
  chest: Chest,
  boss: Boss,
  puzzle: PuzzleHost,
  settings: SettingsScreen,
  collection: Collection,
  achievements: Achievements,
  chapterEnd: ChapterEnd,
  finale: Finale,
  about: About,
  game: GameHost,
  review: GameHost,
  lesson: Lesson,
  placement: Placement,
  parentGate: ParentGate,
  parentHome: ParentHome,
  parentKid: ParentDashboard
};

/** Screens where "a new version" may be offered (never in the middle of a game, a lesson or a party). */
const CALM_SCREENS: Screen['name'][] = ['profiles', 'map', 'settings', 'collection', 'achievements', 'about', 'parentHome'];

/** A slow chunk: move on after this long and let the placeholder show. */
const PRELOAD_WAIT_MS = 250;

type Move = 'fwd' | 'back' | 'none';

export function App() {
  const [view, setView] = useState<{ screen: Screen; move: Move; n: number }>({ screen: { name: 'loading' }, move: 'none', n: 0 });
  /** A screen is coming in: its host clips sideways for those 200ms (an RTL page scrolls to the left). */
  const [moving, setMoving] = useState(false);
  const screen = view.screen;
  const navSeq = useRef(0);
  /** The screen last moved to (for the direction of the next move). */
  const shown = useRef<Screen['name']>('loading');
  /** A new version of the app is waiting (app/updates.ts). */
  const [update, setUpdate] = useState(false);
  useEffect(() => appUpdates().subscribe(setUpdate), []);
  /** Achievements that opened and wait for their badge to drop in (the active profile's). */
  const [toasts, setToasts] = useState<AchievementId[]>([]);

  /**
   * Move to another screen. Its chunk is loaded first (the old screen stays up meanwhile, at most
   * PRELOAD_WAIT_MS), then the new one comes in with the short move of its direction. The last
   * call wins, so a quick second tap never brings back an older screen.
   */
  function setScreen(next: Screen) {
    const seq = ++navSeq.current;
    let done = false;
    const commit = () => {
      if (done || seq !== navSeq.current) return;
      done = true;
      const was = shown.current;
      const move: Move = was === 'loading' ? 'none' : DEPTH[next.name] >= DEPTH[was] ? 'fwd' : 'back';
      shown.current = next.name;
      setMoving(move !== 'none');
      setView((v) => ({ screen: next, move, n: v.n + 1 }));
    };
    const chunk = CHUNKS[next.name];
    if (!chunk || chunk.loaded()) return commit();
    const t = window.setTimeout(commit, PRELOAD_WAIT_MS);
    void chunk.preload().then(() => {
      clearTimeout(t);
      commit();
    });
  }
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [lastId, setLastId] = useState<string | undefined>();
  const active = useActiveProfile();

  async function refresh(): Promise<Profile[]> {
    const list = await listProfiles();
    setProfiles(list);
    setLastId(await getLastProfileId());
    return list;
  }

  useEffect(() => {
    (async () => {
      try {
        await applyWorld('base');
        await deviceId();
        await refresh();
      } catch (e) {
        logError(e, 'start');
      }
      setScreen({ name: 'splash' });
      void requestPersistence();
    })();
  }, []);

  // Shared screens: the base look and no profile's settings. A layout effect, so it runs as the
  // screen appears (a deferred one could run after a quick PIN had entered the profile).
  // The editor applies the world being chosen itself, as a live preview.
  useLayoutEffect(() => {
    if (screen.name === 'splash' || screen.name === 'profiles' || screen.name === 'pin') {
      void applyWorld('base');
      if (screen.name !== 'pin') activateProfile(null);
    }
    // The parents' area keeps the open profile (if any) to go back to its settings.
    if (PARENT_SCREENS.includes(screen.name)) void applyWorld('base');
  }, [screen.name]);

  // Moving to another screen stops anything still being read aloud; each screen starts at the top
  // (the map scrolls itself to where the hero stands).
  useLayoutEffect(() => {
    stopSpeaking();
    if (screen.name !== 'map') window.scrollTo(0, 0);
  }, [view.n]);

  // Achievements (phase 10): when a child's progress changes (an answer, a station, a coin – the
  // stores say so, storage/changes.ts), look for new ones a moment later (one look for a burst of
  // changes) and queue their badges. Opening the map looks too: the first look ever marks what was
  // already earned as shown, quietly. Only the active profile's, on its own screens.
  const lookTimer = useRef(0);
  function lookForAchievements(profileId: string, wait = 450) {
    clearTimeout(lookTimer.current);
    lookTimer.current = window.setTimeout(() => {
      void import('../storage/achievements')
        .then((m) => m.checkAchievements(profileId))
        .then((ids) => {
          if (ids.length && activeProfile()?.id === profileId) setToasts((t) => [...t, ...ids.filter((x) => !t.includes(x))]);
        })
        .catch((e) => logError(e, 'achievements'));
    }, wait);
  }
  useEffect(() => {
    const on = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id && activeProfile()?.id === id) lookForAchievements(id);
    };
    window.addEventListener(PROGRESS_EVENT, on);
    return () => window.removeEventListener(PROGRESS_EVENT, on);
  }, []);
  useEffect(() => {
    if (screen.name === 'map' && active) lookForAchievements(active.id, 0);
  }, [screen.name, active?.id]);
  // Another child (or nobody) now: their badges are not this one's.
  useEffect(() => setToasts([]), [active?.id]);

  // The world's music on the profile's own screens; quiet in lessons and on the shared screens.
  useLayoutEffect(() => {
    setMusicScene(active && MUSIC_SCREENS.includes(screen.name) ? 'play' : 'off');
  }, [screen.name, !!active]);

  async function afterSplash() {
    const list = await refresh();
    setScreen(list.length === 0 ? { name: 'edit', from: 'first' } : { name: 'profiles' });
  }

  async function enterHome(p: Profile, placement = false) {
    activateProfile(p);
    void setLastProfileId(p.id);
    setLastId(p.id);
    await applyWorld(p.worldId);
    setScreen(placement ? { name: 'placement' } : { name: 'map' });
  }

  /** A station on the map was tapped. */
  function openNode(n: QuestNode) {
    if (n.kind === 'lesson') setScreen({ name: 'lesson', skillId: n.skillId, from: 'map', nodeId: n.id });
    else if (n.kind === 'practice') setScreen({ name: 'game', skillId: n.skillId, from: 'map', quest: { nodeId: n.id, level: n.level, template: n.template } });
    else if (n.kind === 'review') setScreen({ name: 'review', skillIds: n.skillIds, count: n.count });
    else if (n.kind === 'chest') setScreen({ name: 'chest', nodeId: n.id });
    else if (n.kind === 'puzzle') setScreen({ name: 'puzzle', nodeId: n.id });
    else setScreen({ name: 'boss', nodeId: n.id });
  }

  function openProfile(p: Profile, then: 'home' | 'edit') {
    if (hasPin(p)) setScreen({ name: 'pin', profile: p, then });
    else if (then === 'home') void enterHome(p);
    else setScreen({ name: 'edit', profile: p, from: 'profiles' });
  }

  async function handleSave(p: Profile, placement = false) {
    await saveProfile(p);
    await refresh();
    await enterHome(p, placement);
  }

  async function handleDelete(p: Profile) {
    await deleteProfile(p.id);
    const list = await refresh();
    if (activeProfile()?.id === p.id) activateProfile(null);
    setScreen(list.length === 0 ? { name: 'edit', from: 'first' } : { name: 'profiles' });
  }

  /** Out of the parents' area, back to where it was opened. */
  function leaveParents(from: ParentFrom) {
    // A parent may have changed this child's settings: take the saved record.
    const was = activeProfile();
    const p = was && (profiles.find((x) => x.id === was.id) ?? was);
    if (from === 'settings' && p) {
      activateProfile(p);
      void applyWorld(p.worldId);
      setScreen({ name: 'settings' });
    } else {
      // From the first run (a restore, perhaps): to "who is playing?" if there is anyone now.
      void refresh().then((list) => setScreen(list.length ? { name: 'profiles' } : { name: 'edit', from: 'first' }));
    }
  }

  /** From a child's dashboard into their world: the parent hands the phone over (no PIN – the parent is in). */
  async function handOver(p: Profile, next: Screen) {
    activateProfile(p);
    void setLastProfileId(p.id);
    setLastId(p.id);
    await applyWorld(p.worldId);
    setScreen(next);
  }

  function leaveEditor(from: EditFrom) {
    if (from === 'settings' && active) {
      // Back to the profile's own skin.
      void applyWorld(active.worldId);
      setScreen({ name: 'settings' });
    } else if (from === 'first' || profiles.length === 0) setScreen({ name: 'splash' });
    else setScreen({ name: 'profiles' });
  }

  const body = renderScreen();
  // The map's dock and break card are position: fixed – a transform would carry them along, so the
  // map only fades in.
  // Badges only on the child's own screens (not the shared or the parents' ones), and not over the
  // chapter's or the journey's own party – they wait for the map.
  const own = !!active && !['loading', 'splash', 'profiles', 'pin', 'edit', 'about', 'chapterEnd', 'finale', ...PARENT_SCREENS].includes(screen.name);
  return (
    <>
      {update && CALM_SCREENS.includes(screen.name) && (
        <div class="update-bar" role="status" data-testid="update-bar">
          <span>✨ יש גרסה חדשה של MathIt</span>
          <button type="button" class="btn btn-primary" data-testid="update-now" onClick={() => appUpdates().apply()}>
            לעדכן
          </button>
        </div>
      )}
      <div class={`stage-host${moving ? ' is-moving' : ''}`}>
        <div
          class={`stage move-${view.move}${screen.name === 'map' ? ' is-fade' : ''}`}
          key={view.n}
          data-screen={screen.name}
          data-move={view.move}
          onAnimationEnd={(e) => e.target === e.currentTarget && setMoving(false)}
        >
          {body}
        </div>
      </div>
      <div class="ach-live" role="status" aria-live="polite">
        {own && toasts.length > 0 && <AchievementToast key={toasts[0]} id={toasts[0]} profile={active!} onDone={() => setToasts((t) => t.slice(1))} />}
      </div>
    </>
  );

  function renderScreen() {
    switch (screen.name) {
      case 'loading':
        return <main class="screen loading" aria-busy="true" />;
      case 'splash':
        return <Splash onStart={() => void afterSplash()} />;
      case 'profiles':
        return (
          <ProfilePicker
            profiles={profiles}
            lastId={lastId}
            onPick={(p) => openProfile(p, 'home')}
            onEdit={(p) => openProfile(p, 'edit')}
            onCreate={() => setScreen({ name: 'edit', from: 'profiles' })}
            onParents={() => setScreen({ name: 'parentGate', from: 'profiles' })}
          />
        );
      case 'edit':
        return (
          <ProfileEditor
            key={screen.profile?.id ?? 'new'}
            profile={screen.profile}
            onSave={(p, placement) => void handleSave(p, placement)}
            onDelete={(p) => void handleDelete(p)}
            onCancel={() => leaveEditor(screen.from)}
            onRestore={screen.from === 'first' ? () => setScreen({ name: 'parentGate', from: 'first' }) : undefined}
          />
        );
      case 'pin':
        return (
          <PinScreen
            profile={screen.profile}
            onCancel={() => setScreen({ name: 'profiles' })}
            onPass={(p, reset) => {
              if (reset) void refresh();
              if (screen.then === 'home') void enterHome(p);
              else setScreen({ name: 'edit', profile: p, from: 'profiles' });
            }}
          />
        );
      case 'map':
        if (!active) return <main class="screen loading" aria-busy="true" />;
        return (
          <QuestMap
            key={active.id}
            profile={active}
            onSwitch={() => {
              void refresh();
              setScreen({ name: 'profiles' });
            }}
            onSettings={() => setScreen({ name: 'settings' })}
            onPractice={() => setScreen({ name: 'practice' })}
            onCollection={() => setScreen({ name: 'collection' })}
            onAchievements={() => setScreen({ name: 'achievements' })}
            onNode={openNode}
          />
        );
      case 'collection':
        if (!active) return <main class="screen loading" aria-busy="true" />;
        return <Collection profile={active} onBack={() => setScreen({ name: 'map' })} />;
      case 'achievements':
        if (!active) return <main class="screen loading" aria-busy="true" />;
        return <Achievements profile={active} onBack={() => setScreen({ name: 'map' })} onCertificate={() => setScreen({ name: 'finale', replay: true })} />;
      case 'practice':
        if (!active) return <main class="screen loading" aria-busy="true" />;
        return (
          <Home
            profile={active}
            onBack={() => setScreen({ name: 'map' })}
            onPlay={(skillId) => setScreen({ name: 'game', skillId, from: 'practice' })}
            onLesson={(skillId) => setScreen({ name: 'lesson', skillId, from: 'practice' })}
          />
        );
      case 'game':
        if (!active) return <main class="screen loading" aria-busy="true" />;
        return (
          <GameHost
            key={`${screen.skillId}:${screen.quest?.nodeId ?? ''}:${screen.focus ?? ''}`}
            profile={active}
            skillId={screen.skillId}
            quest={screen.quest}
            focus={screen.focus}
            onHome={() => setScreen(screen.from === 'map' ? { name: 'map' } : { name: 'practice' })}
          />
        );
      case 'review':
        if (!active) return <main class="screen loading" aria-busy="true" />;
        return <GameHost key="review" profile={active} review={{ skillIds: screen.skillIds, count: screen.count }} onHome={() => setScreen({ name: 'map' })} />;
      case 'placement':
        if (!active) return <main class="screen loading" aria-busy="true" />;
        return <Placement key={active.id} profile={active} onDone={() => setScreen({ name: 'map' })} />;
      case 'lesson':
        if (!active) return <main class="screen loading" aria-busy="true" />;
        return (
          <Lesson
            key={`${screen.skillId}:${screen.nodeId ?? ''}`}
            profile={active}
            skillId={screen.skillId}
            nodeId={screen.nodeId}
            onHome={() => setScreen(screen.from === 'map' ? { name: 'map' } : { name: 'practice' })}
            onPractice={() => setScreen({ name: 'game', skillId: screen.skillId, from: screen.from })}
          />
        );
      case 'chest':
        if (!active) return <main class="screen loading" aria-busy="true" />;
        return <Chest key={screen.nodeId} profile={active} nodeId={screen.nodeId} onMap={() => setScreen({ name: 'map' })} />;
      case 'boss':
        if (!active) return <main class="screen loading" aria-busy="true" />;
        return <Boss key={screen.nodeId} profile={active} nodeId={screen.nodeId} onMap={() => setScreen({ name: 'map' })} onChapterEnd={() => setScreen({ name: 'chapterEnd', nodeId: screen.nodeId })} />;
      case 'chapterEnd':
        if (!active) return <main class="screen loading" aria-busy="true" />;
        return <ChapterEnd key={screen.nodeId} profile={active} nodeId={screen.nodeId} onMap={() => setScreen({ name: 'map' })} onFinale={() => setScreen({ name: 'finale' })} />;
      case 'finale':
        if (!active) return <main class="screen loading" aria-busy="true" />;
        return <Finale profile={active} replay={screen.replay} onMap={() => setScreen({ name: 'map' })} />;
      case 'puzzle':
        if (!active) return <main class="screen loading" aria-busy="true" />;
        return <PuzzleHost key={screen.nodeId} profile={active} nodeId={screen.nodeId} onMap={() => setScreen({ name: 'map' })} />;
      case 'settings':
        return (
          <SettingsScreen
            onBack={() => {
              void refresh();
              setScreen({ name: 'map' });
            }}
            onEdit={() => active && setScreen({ name: 'edit', profile: active, from: 'settings' })}
            onPlacement={() => setScreen({ name: 'placement' })}
            onParents={() => setScreen({ name: 'parentGate', from: 'settings' })}
            onAbout={() => setScreen({ name: 'about', back: { name: 'settings' }, backLabel: 'להגדרות' })}
          />
        );
      case 'about':
        return <About backLabel={screen.backLabel} onBack={() => setScreen(screen.back)} />;
      case 'parentGate':
        return <ParentGate exitLabel={PARENT_EXIT[screen.from]} onExit={() => leaveParents(screen.from)} onPass={() => setScreen({ name: 'parentHome', from: screen.from })} />;
      case 'parentHome':
        return (
          <ParentHome
            profiles={profiles}
            exitLabel={PARENT_EXIT[screen.from]}
            onExit={() => leaveParents(screen.from)}
            onChild={(p) => setScreen({ name: 'parentKid', from: screen.from, profileId: p.id })}
            onAbout={() => setScreen({ name: 'about', back: { name: 'parentHome', from: screen.from }, backLabel: 'לאזור ההורים' })}
            onRestored={() => {
              // The open profile may be gone or changed: everyone picks again on the way out.
              activateProfile(null);
              void refresh();
            }}
          />
        );
      case 'parentKid': {
        const kid = profiles.find((p) => p.id === screen.profileId);
        if (!kid) return <main class="screen loading" aria-busy="true" />;
        return (
          <ParentDashboard
            key={kid.id}
            profile={kid}
            onBack={() => setScreen({ name: 'parentHome', from: screen.from })}
            onPractice={(skillId, focus) => void handOver(kid, { name: 'game', skillId, from: 'map', focus })}
            onLesson={(skillId) => void handOver(kid, { name: 'lesson', skillId, from: 'map' })}
            onSave={(p) => void saveProfile(p).then(refresh)}
          />
        );
      }
    }
  }
}
