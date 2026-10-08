// "Who is playing?" – the first screen after the splash. Each child's tile is in the colours of
// their own world (worldStyle on the tile), the one who played last is marked.
import { useEffect, useState } from 'preact/hooks';
import { playSfx } from '../audio/sfx';
import { versionLabel } from '../app/version';
import { SpeakButton } from '../components/Speak';
import { hasPin } from '../profiles/pin';
import { byGender, type Profile } from '../profiles/profiles';
import { loadAllWorlds, prefersDark, WORLD_LIST, worldStyle, type WorldTheme } from '../worlds/index';

interface Props {
  profiles: Profile[];
  lastId?: string;
  onPick: (p: Profile) => void;
  onCreate: () => void;
  onEdit: (p: Profile) => void;
  /** The parents' area (phase 8, behind a door for adults). */
  onParents: () => void;
}

const TITLE = 'מי משחק?';

export function ProfilePicker({ profiles, lastId, onPick, onCreate, onEdit, onParents }: Props) {
  const [worlds, setWorlds] = useState<WorldTheme[]>([]);
  useEffect(() => {
    let alive = true;
    void loadAllWorlds().then((w) => alive && setWorlds(w));
    return () => {
      alive = false;
    };
  }, []);
  const dark = prefersDark();

  return (
    <main class="screen profiles-screen">
      <header class="picker-head enter">
        <h1 class="picker-title">
          {TITLE} <SpeakButton text={TITLE} class="speak-inline" />
        </h1>
      </header>

      <ul class="profile-grid">
        {profiles.map((p, i) => {
          const w = worlds.find((x) => x.id === p.worldId);
          const meta = WORLD_LIST.find((x) => x.id === p.worldId);
          return (
            <li key={p.id} class="profile-tile enter" style={`${w ? worldStyle(w, dark) : ''};--i:${i}`}>
              <button
                type="button"
                class="profile-pick"
                data-profile-id={p.id}
                onClick={() => {
                  playSfx('tap');
                  onPick(p);
                }}
              >
                <span class="avatar avatar-lg" aria-hidden="true">
                  {p.avatar}
                </span>
                <span class="profile-name">
                  {p.name}
                  {hasPin(p) && (
                    <span class="profile-lock" aria-label="עם PIN">
                      {' '}
                      🔒
                    </span>
                  )}
                </span>
                {meta && (
                  <span class="profile-world">
                    <span aria-hidden="true">{meta.icon}</span> {meta.name}
                  </span>
                )}
                {p.id === lastId && profiles.length > 1 && <span class="profile-last">{byGender(p, 'שיחק לאחרונה', 'שיחקה לאחרונה', 'שיחק/ה לאחרונה')}</span>}
              </button>
              <button type="button" class="profile-edit" data-edit-id={p.id} onClick={() => onEdit(p)} aria-label={`עריכת הפרופיל של ${p.name}`}>
                ✎
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        class="btn btn-secondary"
        data-testid="new-profile"
        onClick={() => {
          playSfx('tap');
          onCreate();
        }}
      >
        + פרופיל חדש
      </button>

      <button
        type="button"
        class="btn btn-ghost parent-entry"
        data-testid="open-parents"
        onClick={() => {
          playSfx('tap');
          onParents();
        }}
      >
        👪 להורים
      </button>

      <p class="fineprint">הפרופילים נשמרים רק בטלפון הזה.</p>
      <p class="version fineprint">
        גרסה <span class="math">{versionLabel()}</span>
      </p>
    </main>
  );
}
