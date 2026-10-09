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
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
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
import { lazy } from './lazy';
import { logError } from './errorLog';

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
  | { name: 'parentGate'; from: ParentFrom }
  | { name: 'parentHome'; from: ParentFrom }
  | { name: 'parentKid'; from: ParentFrom; profileId: string };

/** The parents' screens: the neutral base look, whoever's profile is open behind them. */
const PARENT_SCREENS: Screen['name'][] = ['parentGate', 'parentHome', 'parentKid'];

/** Screens with the world's music (the rest are quiet). */
const MUSIC_SCREENS: Screen['name'][] = ['map', 'practice', 'game', 'review', 'placement', 'chest', 'boss', 'puzzle', 'collection', 'settings'];

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'loading' });
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
  useEffect(() => {
    stopSpeaking();
    if (screen.name !== 'map') window.scrollTo(0, 0);
  }, [screen.name]);

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
          onNode={openNode}
        />
      );
    case 'collection':
      if (!active) return <main class="screen loading" aria-busy="true" />;
      return <Collection profile={active} onBack={() => setScreen({ name: 'map' })} />;
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
      return <Boss key={screen.nodeId} profile={active} nodeId={screen.nodeId} onMap={() => setScreen({ name: 'map' })} />;
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
        />
      );
    case 'parentGate':
      return <ParentGate exitLabel={PARENT_EXIT[screen.from]} onExit={() => leaveParents(screen.from)} onPass={() => setScreen({ name: 'parentHome', from: screen.from })} />;
    case 'parentHome':
      return (
        <ParentHome
          profiles={profiles}
          exitLabel={PARENT_EXIT[screen.from]}
          onExit={() => leaveParents(screen.from)}
          onChild={(p) => setScreen({ name: 'parentKid', from: screen.from, profileId: p.id })}
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
