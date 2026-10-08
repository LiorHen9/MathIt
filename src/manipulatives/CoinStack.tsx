// CoinStack (מטבעות, phase 7): the coins drop one by one onto a tray, biggest first, each with a
// metal clink, and the running total is counted up under them (10, 15, 17, 17.50 ₪).
import { useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { moneyText } from '../core/types';
import { Coin, coinName } from '../ui/art';
import { popIn, pulse, useRun, type RunProps } from './timeline';
import { Frame, Total, q } from './parts';

export function CoinStack({ coins, ...run }: { coins: number[] } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  const sorted = [...coins].sort((a, b) => b - a);
  const total = Math.round(sorted.reduce((s, c) => s + c, 0) * 100) / 100;
  useRun(
    root,
    async (tl, el) => {
      const items = q(el, '.cs-coin');
      const run = el.querySelector<HTMLElement>('.cs-run')!;
      run.textContent = '';
      let sum = 0;
      for (let i = 0; i < items.length; i++) {
        sum = Math.round((sum + sorted[i]) * 100) / 100;
        const drop: Keyframe[] = tl.calm
          ? [
              { opacity: 0, transform: 'scale(0.85)' },
              { opacity: 1, transform: 'scale(1)' }
            ]
          : [
              { opacity: 0, transform: 'translateY(-36px) rotate(-25deg)' },
              { opacity: 1, transform: 'translateY(3px) rotate(4deg)', offset: 0.7 },
              { opacity: 1, transform: 'translateY(0) rotate(0deg)' }
            ];
        await tl.anim(items[i], drop, 380, { easing: 'cubic-bezier(.3,.7,.4,1)' });
        emit({ type: 'clink', n: i + 1 });
        run.textContent = moneyText(sum);
        await tl.anim(run, pulse(tl.calm, 1.2), 260);
        await tl.wait(160);
      }
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  return (
    <Frame kind="coins" label={`מטבעות: ${sorted.map(coinName).join(', ')}. יחד ${moneyText(total)}`} rootRef={root}>
      <span class="cs-tray">
        {sorted.map((v, i) => (
          <span key={i} class="cs-coin m-hide">
            <Coin value={v} />
          </span>
        ))}
      </span>
      <span class="cs-run" dir="ltr" aria-hidden="true">
        {moneyText(total)}
      </span>
      <Total>{moneyText(total)}</Total>
    </Frame>
  );
}
