// One card per world, each in its own colours (worldStyle scopes the world's variables to the
// card), with the hero breathing inside. A tap plays the world's sample sound, the hero hops and
// the world is chosen; the screen around it changes skin live (the parent calls applyWorld).
// Used when creating a profile and in the settings.
import { useEffect, useState } from 'preact/hooks';
import { playSfx, type SfxName } from '../audio/sfx';
import { Hero } from '../fx/Hero';
import { hop } from '../fx/motion';
import { loadAllWorlds, prefersDark, WORLD_LIST, worldStyle, type WorldTheme } from '../worlds/index';
import type { Gender, PlayWorldId } from '../profiles/profiles';

interface Props {
  value: PlayWorldId | null;
  onChange: (id: PlayWorldId) => void;
  /** The hero matches the child (a striker or a "חלוצה"). */
  gender?: Gender;
}

export function WorldPicker({ value, onChange, gender }: Props) {
  const [worlds, setWorlds] = useState<WorldTheme[] | null>(null);
  useEffect(() => {
    let alive = true;
    void loadAllWorlds().then((w) => alive && setWorlds(w));
    return () => {
      alive = false;
    };
  }, []);
  const dark = prefersDark();

  return (
    <div class="world-grid" role="radiogroup" aria-label="בחירת עולם">
      {WORLD_LIST.map((meta) => {
        const w = worlds?.find((x) => x.id === meta.id);
        const on = value === meta.id;
        return (
          <button
            type="button"
            key={meta.id}
            role="radio"
            aria-checked={on}
            data-world-id={meta.id}
            class={`world-card ${on ? 'is-on' : ''}`}
            style={w ? worldStyle(w, dark) : undefined}
            onClick={(e) => {
              playSfx(`world-${meta.id}` as SfxName);
              hop((e.currentTarget as HTMLElement).querySelector('.hero'));
              onChange(meta.id);
            }}
          >
            <span class="world-stage">
              {w?.hero ? <Hero def={w.hero} gender={gender} /> : <span class="world-stage-icon" aria-hidden="true">{meta.icon}</span>}
            </span>
            <span class="world-name">
              <span aria-hidden="true">{meta.icon}</span> {meta.name}
            </span>
            {w && <span class="world-blurb">{w.blurb}</span>}
            {on && (
              <span class="world-check" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
