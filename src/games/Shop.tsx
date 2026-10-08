// Shop (חנות, docs/ARCHITECTURE.md §4.3): the world's shop. On the counter one of the world's
// things for sale (World.vocabulary.thing, its icon from World.templateSkins.shop) with its price
// tag; the child pays exactly – or gives the change – by tapping coins onto the tray
// (games/CoinTray.tsx), then "משלמים ✓". The world dresses the stall (a fairy stall, a kiosk at
// the pitch, a dojo market, a mine trading post…).
import { useRef, useState } from 'preact/hooks';
import { answerKey, moneyText } from '../core/types';
import { useWorld } from '../worlds/index';
import { CoinTray, coinTotal } from './CoinTray';
import { PromptCard, type TemplateProps } from './PromptCard';

/** The price and (for change) what was paid, read from the shop prompt's numbers. */
function priceOf(text: string): { price: number; paid?: number } {
  const xs = [...text.matchAll(/(\d+(?:\.\d+)?) ₪/g)].map((m) => Number(m[1]));
  return { price: xs[0] ?? 0, paid: xs[1] };
}

export function Shop({ question: q, done, tried, reveal, hint, earlyHint, explaining, onAnswer }: TemplateProps) {
  const world = useWorld();
  const skin = world.templateSkins?.shop;
  const things = world.vocabulary?.thing ?? [];
  const k = things.findIndex((t) => q.prompt.text.includes(t));
  const icon = skin?.icons?.[k >= 0 ? k : 0] ?? '🎁';
  const name = k >= 0 ? things[k] : '';
  const { price, paid } = priceOf(q.prompt.text);
  const [coins, setCoins] = useState<number[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const value = coinTotal(coins);
  const off = done || reveal;
  const triedThis = tried.some((t) => answerKey(t) === answerKey(value));
  const change = paid !== undefined;
  return (
    <div class="shop">
      <PromptCard question={q} done={done} reveal={reveal} hint={hint} earlyHint={earlyHint} explaining={explaining} noPicture />
      {!explaining && (
        <div class={`sh-stall skin-${skin?.look ?? 'stall'}`} data-skin={skin?.look ?? 'stall'} ref={box}>
          <div class="sh-counter">
            <span class="sh-item" aria-hidden="true">
              {icon}
            </span>
            <span class="sh-tag" dir="ltr" aria-label={`${name} עולה ${moneyText(price)}`}>
              {moneyText(price)}
            </span>
            {change && (
              <span class="sh-paid" aria-label={`שילמו ${moneyText(paid!)}`}>
                <span aria-hidden="true">שילמו</span>{' '}
                <span dir="ltr" aria-hidden="true">
                  {moneyText(paid!)}
                </span>
              </span>
            )}
          </div>
          <CoinTray coins={coins} onChange={setCoins} values={Number.isInteger(q.answer as number) ? [10, 5, 2, 1] : [10, 5, 2, 1, 0.5]} disabled={off} label={change ? 'העודף' : 'הקופה'} />
          <button
            type="button"
            class="btn btn-primary bd-check"
            data-testid="shop-pay"
            disabled={off || value <= 0 || triedThis}
            onClick={(e) => onAnswer(value, box.current ?? e.currentTarget)}
          >
            {change ? 'נותנים עודף ✓' : 'משלמים ✓'}
          </button>
        </div>
      )}
    </div>
  );
}
