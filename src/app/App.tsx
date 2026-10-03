// The whole app is a small state machine: one screen at a time, no router (as in ChessIt).
// loading → splash → "who is playing?" (or straight to a new profile the first time)
//   → [PIN] → the profile's home ⇄ settings / editing, home ⇄ a practice round (game),
//   home ⇄ a lesson → (practice).
// Shared screens (splash, "who is playing?", PIN) use the base look and default settings; a
// profile's own screens use its world and its settings (applyWorld + activateProfile).
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import { deviceId, requestPersistence } from '../storage/db';
import { applyWorld } from '../worlds/index';
import { stopSpeaking } from '../audio/speech';
import { Splash } from '../screens/Splash';
import { hasPin } from '../profiles/pin';
import { deleteProfile, getLastProfileId, listProfiles, saveProfile, setLastProfileId, type Profile } from '../profiles/profiles';
import { activateProfile, activeProfile, useActiveProfile } from '../profiles/settings';
import type { SkillId } from '../core/types';
import { lazy } from './lazy';
import { logError } from './errorLog';

// Not needed for the first screen: separate chunks (see lazy.tsx).
const ProfilePicker = lazy(() => import('../screens/ProfilePicker').then((m) => m.ProfilePicker));
const ProfileEditor = lazy(() => import('../screens/ProfileEditor').then((m) => m.ProfileEditor));
const PinScreen = lazy(() => import('../screens/PinScreen').then((m) => m.PinScreen));
const Home = lazy(() => import('../screens/Home').then((m) => m.Home));
const SettingsScreen = lazy(() => import('../screens/SettingsScreen').then((m) => m.SettingsScreen));
// The game brings the generators and the feedback engine with it.
const GameHost = lazy(() => import('../screens/GameHost').then((m) => m.GameHost));
// A lesson brings the teaching animations (shared with the game).
const Lesson = lazy(() => import('../screens/Lesson').then((m) => m.Lesson));

/** Where "back" from the editor goes. */
type EditFrom = 'profiles' | 'settings' | 'first';

type Screen =
  | { name: 'loading' }
  | { name: 'splash' }
  | { name: 'profiles' }
  | { name: 'edit'; profile?: Profile; from: EditFrom }
  | { name: 'pin'; profile: Profile; then: 'home' | 'edit' }
  | { name: 'home' }
  | { name: 'settings' }
  | { name: 'game'; skillId: SkillId }
  | { name: 'lesson'; skillId: SkillId };

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
  }, [screen.name]);

  // Moving to another screen stops anything still being read aloud; each screen starts at the top.
  useEffect(() => {
    stopSpeaking();
    window.scrollTo(0, 0);
  }, [screen.name]);

  async function afterSplash() {
    const list = await refresh();
    setScreen(list.length === 0 ? { name: 'edit', from: 'first' } : { name: 'profiles' });
  }

  async function enterHome(p: Profile) {
    activateProfile(p);
    void setLastProfileId(p.id);
    setLastId(p.id);
    await applyWorld(p.worldId);
    setScreen({ name: 'home' });
  }

  function openProfile(p: Profile, then: 'home' | 'edit') {
    if (hasPin(p)) setScreen({ name: 'pin', profile: p, then });
    else if (then === 'home') void enterHome(p);
    else setScreen({ name: 'edit', profile: p, from: 'profiles' });
  }

  async function handleSave(p: Profile) {
    await saveProfile(p);
    await refresh();
    await enterHome(p);
  }

  async function handleDelete(p: Profile) {
    await deleteProfile(p.id);
    const list = await refresh();
    if (activeProfile()?.id === p.id) activateProfile(null);
    setScreen(list.length === 0 ? { name: 'edit', from: 'first' } : { name: 'profiles' });
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
        />
      );
    case 'edit':
      return (
        <ProfileEditor
          key={screen.profile?.id ?? 'new'}
          profile={screen.profile}
          onSave={(p) => void handleSave(p)}
          onDelete={(p) => void handleDelete(p)}
          onCancel={() => leaveEditor(screen.from)}
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
    case 'home':
      if (!active) return <main class="screen loading" aria-busy="true" />;
      return (
        <Home
          profile={active}
          onSwitch={() => {
            void refresh();
            setScreen({ name: 'profiles' });
          }}
          onSettings={() => setScreen({ name: 'settings' })}
          onPlay={(skillId) => setScreen({ name: 'game', skillId })}
          onLesson={(skillId) => setScreen({ name: 'lesson', skillId })}
        />
      );
    case 'game':
      if (!active) return <main class="screen loading" aria-busy="true" />;
      return <GameHost key={screen.skillId} profile={active} skillId={screen.skillId} onHome={() => setScreen({ name: 'home' })} />;
    case 'lesson':
      if (!active) return <main class="screen loading" aria-busy="true" />;
      return (
        <Lesson
          key={screen.skillId}
          profile={active}
          skillId={screen.skillId}
          onHome={() => setScreen({ name: 'home' })}
          onPractice={() => setScreen({ name: 'game', skillId: screen.skillId })}
        />
      );
    case 'settings':
      return (
        <SettingsScreen
          onBack={() => {
            void refresh();
            setScreen({ name: 'home' });
          }}
          onEdit={() => active && setScreen({ name: 'edit', profile: active, from: 'settings' })}
        />
      );
  }
}
