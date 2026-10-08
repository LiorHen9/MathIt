// "My collection" (האוסף שלי, phase 5): a shelf for every world, each in its own colours, with the
// world's coins and its collectibles – what was won (from chests and beaten bosses) and the
// silhouettes of what is still waiting. Each world keeps its own (storage/inventory.ts), so a
// child who switches worlds finds the old shelf still there. Stickers from chests opened before
// phase 5 have their own little shelf. Opened from the map; loaded lazily.
import { useEffect, useState } from 'preact/hooks';
import { SpeakButton, useAutoSpeak } from '../components/Speak';
import { byGender, type Profile } from '../profiles/profiles';
import { listInventories, type Inventory } from '../storage/inventory';
import { getQuestRecord } from '../storage/questProgress';
import { loadAllWorlds, prefersDark, useWorld, worldStyle, type WorldTheme } from '../worlds/index';
import { playSfx } from '../audio/sfx';

interface Props {
  profile: Profile;
  onBack: () => void;
}

interface Data {
  worlds: WorldTheme[];
  inv: Record<string, Inventory | undefined>;
  stickers: string[];
}

export function Collection({ profile, onBack }: Props) {
  const current = useWorld();
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([loadAllWorlds(), listInventories(profile.id), getQuestRecord(profile.id)]).then(([worlds, invs, quest]) => {
      if (!alive) return;
      const rewardIcons = new Set(worlds.flatMap((w) => (w.rewards ?? []).map((r) => r.icon)));
      // The world being played first, then the others in picker order.
      const order = [...worlds.filter((w) => w.id === current.id), ...worlds.filter((w) => w.id !== current.id)];
      setData({
        worlds: order,
        inv: Object.fromEntries(invs.map((i) => [i.worldId, i])),
        stickers: Object.values(quest.chests).filter((icon) => !rewardIcons.has(icon))
      });
    });
    return () => {
      alive = false;
    };
  }, [profile.id]);

  const total = data ? data.worlds.reduce((n, w) => n + (data.inv[w.id]?.items.length ?? 0), 0) : 0;
  const all = data ? data.worlds.reduce((n, w) => n + (w.rewards?.length ?? 0), 0) : 0;
  const line = total === 0 ? `האוסף עוד ריק – ${byGender(profile, 'פתח', 'פתחי', 'פתחו')} תיבות ו${byGender(profile, 'נצח', 'נצחי', 'נצחו')} בוסים!` : `יש לך ${total} ${total === 1 ? 'פריט' : 'פריטים'} באוסף!`;
  useAutoSpeak(data ? line : null, 'collection');

  if (!data) return <main class="screen loading" aria-busy="true" />;
  const dark = prefersDark();
  return (
    <main class="screen collection" data-testid="collection">
      <header class="topbar">
        <button
          type="button"
          class="btn btn-ghost"
          data-testid="collection-back"
          onClick={() => {
            playSfx('tap');
            onBack();
          }}
        >
          <span aria-hidden="true">→</span> למפה
        </button>
        <h1 class="topbar-title">🎒 האוסף שלי</h1>
        <span />
      </header>

      <p class="collection-line">
        {line} <SpeakButton text={line} class="speak-inline" />
      </p>
      <p class="collection-count" data-testid="collection-count" dir="rtl">
        <span dir="ltr">
          {total}/{all}
        </span>
      </p>

      {data.worlds.map((w) => {
        const inv = data.inv[w.id];
        const coin = w.coin ?? { icon: '🪙', name: 'מטבעות' };
        return (
          <section key={w.id} class={`shelf ${w.id === current.id ? 'is-current' : ''}`} style={worldStyle(w, dark)} data-world={w.id} aria-label={`האוסף בעולם ${w.name}`}>
            <h2 class="shelf-title">
              <span aria-hidden="true">{w.icon}</span> {w.name}
              <span class="chip coin-chip shelf-coins" data-coins={inv?.coins ?? 0} aria-label={`${inv?.coins ?? 0} ${coin.name}`}>
                <span aria-hidden="true">{coin.icon}</span> <span dir="ltr">{inv?.coins ?? 0}</span>
              </span>
            </h2>
            <ul class="shelf-items">
              {(w.rewards ?? []).map((r) => {
                const has = !!inv?.items.includes(r.id);
                return (
                  <li key={r.id} class={`shelf-item ${has ? 'is-owned' : 'is-missing'}`} data-item={r.id} data-owned={has ? 'yes' : 'no'}>
                    <span class="shelf-icon" aria-hidden="true">
                      {r.icon}
                    </span>
                    <span class="shelf-name">{has ? r.name : 'עוד לא'}</span>
                    {!has && <span class="visually-hidden">{r.name} – עוד לא באוסף</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {data.stickers.length > 0 && (
        <section class="shelf" data-world="stickers" aria-label="מדבקות מהמסע">
          <h2 class="shelf-title">🌈 מדבקות מהמסע</h2>
          <ul class="shelf-items">
            {data.stickers.map((s, i) => (
              <li key={i} class="shelf-item is-owned" data-item={`sticker-${i}`} data-owned="yes">
                <span class="shelf-icon" aria-hidden="true">
                  {s}
                </span>
                <span class="shelf-name">מדבקה</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
