// The world's coins (phase 5): a purse chip that shows how many the profile has in this world,
// and `useCoins` to earn one – the coin flies from where it was earned (the bubble, the boss)
// into the purse (the director's `coin` event: the world's coin, its sound), the count ticks up
// as it lands, and it is saved at once (storage/inventory.ts).
import type { Ref } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { emit } from '../fx/director';
import { pop, reducedMotion } from '../fx/motion';
import { addCoins, getInventory } from '../storage/inventory';
import type { WorldTheme } from '../worlds/index';

/** flyTo lands in about this long. */
const LAND_MS = 560;
/** The coin follows the right answer's own feedback a moment later. */
const AFTER_MS = 220;

export function useCoins(profileId: string, world: WorldTheme) {
  const [coins, setCoins] = useState<number | null>(null);
  const chip = useRef<HTMLSpanElement>(null);
  const total = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    let alive = true;
    void getInventory(profileId, world.id).then((inv) => {
      if (!alive) return;
      total.current = inv.coins;
      setCoins(inv.coins);
    });
    return () => {
      alive = false;
      timers.current.forEach(clearTimeout);
    };
  }, [profileId, world.id]);

  /** Earn `n` coins (one per right answer) from an element on screen. */
  function earn(n: number, from?: Element | null) {
    total.current += n;
    const now = total.current;
    void addCoins(profileId, world.id, n);
    const fast = reducedMotion();
    timers.current.push(
      window.setTimeout(() => {
        emit({ type: 'coin', n: now }, { el: from, to: chip.current });
        timers.current.push(
          window.setTimeout(() => {
            setCoins(now);
            if (!fast) pop(chip.current, 1.2);
          }, fast ? 0 : LAND_MS)
        );
      }, AFTER_MS)
    );
  }

  return { coins, chip, earn };
}

export function CoinChip({ world, coins, chipRef, class: cls = '' }: { world: WorldTheme; coins: number | null; chipRef?: Ref<HTMLSpanElement>; class?: string }) {
  const coin = world.coin ?? { icon: '🪙', name: 'מטבעות' };
  return (
    <span class={`chip coin-chip ${cls}`} ref={chipRef} data-testid="coins" data-coins={coins ?? 0} aria-label={`${coins ?? 0} ${coin.name}`}>
      <span aria-hidden="true">{coin.icon}</span>{' '}
      <span dir="ltr" aria-hidden="true">
        {coins ?? 0}
      </span>
    </span>
  );
}
