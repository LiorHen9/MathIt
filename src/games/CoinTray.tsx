// A tray the child fills with coins by tapping the coin buttons (and empties by tapping a coin on
// the tray), the total written under it – shared by Build (money) and Shop. One finger, every
// button ≥ 48px with its own aria-label; each coin lands with the "clink" teaching sound.
import { useRef } from 'preact/hooks';
import { moneyText } from '../core/types';
import { emit } from '../fx/director';
import { Coin, coinName } from '../ui/art';

export const TRAY_MAX = 10;

interface Props {
  coins: number[];
  onChange: (coins: number[]) => void;
  /** The coin buttons offered (biggest first). */
  values: number[];
  disabled?: boolean;
  /** What the tray is: "הקופה", "העודף". */
  label: string;
  trayRef?: { current: HTMLDivElement | null };
}

export const coinTotal = (cs: number[]) => Math.round(cs.reduce((s, c) => s + c, 0) * 100) / 100;

export function CoinTray({ coins, onChange, values, disabled = false, label, trayRef }: Props) {
  const own = useRef<HTMLDivElement>(null);
  const ref = trayRef ?? own;
  const total = coinTotal(coins);
  return (
    <div class="coin-tray-box">
      <div class="coin-tray" ref={ref} role="group" aria-label={`${label}: ${moneyText(total)}`} dir="ltr" data-testid="coin-tray" data-total={total}>
        {coins.length === 0 && <span class="coin-tray-empty">{label}</span>}
        {coins.map((v, i) => (
          <button
            type="button"
            key={`${i}:${v}`}
            class="tray-coin"
            aria-label={`להוריד ${coinName(v)}`}
            disabled={disabled}
            onClick={() => {
              emit({ type: 'tap' });
              onChange(coins.filter((_, k) => k !== i));
            }}
          >
            <Coin value={v} />
          </button>
        ))}
      </div>
      <p class="coin-total" dir="ltr" data-testid="coin-total">
        {moneyText(total)}
      </p>
      <div class="coin-buttons" dir="ltr" role="group" aria-label="מטבעות">
        {values.map((v) => (
          <button
            type="button"
            key={v}
            class="coin-btn"
            data-coin={v}
            aria-label={`להוסיף ${coinName(v)}`}
            disabled={disabled || coins.length >= TRAY_MAX}
            onClick={() => {
              const next = [...coins, v].sort((a, b) => b - a);
              emit({ type: 'clink', n: next.length });
              onChange(next);
            }}
          >
            <Coin value={v} />
          </button>
        ))}
      </div>
    </div>
  );
}
