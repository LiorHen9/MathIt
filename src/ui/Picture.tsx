// A question's picture (core/types Visual): stars (ui/Dots.tsx), tens rods and ones cubes, coins,
// or a clock. Static – the animated versions are the manipulatives.
import type { Visual } from '../core/types';
import { Dots } from './Dots';
import { ClockFace, Coin, Cube, Rod, coinName } from './art';
import { timeWords } from '../core/generators/clock';

export function Picture({ visual, class: cls = '' }: { visual: Visual; class?: string }) {
  switch (visual.kind) {
    case 'dots':
      return <Dots visual={visual} class={cls} />;
    case 'blocks':
      return (
        <div class={`pic-blocks ${cls}`} role="img" aria-label={`${visual.tens === 1 ? 'מוט אחד' : `${visual.tens} מוטות`}${visual.ones ? ` ו-${visual.ones === 1 ? 'קובייה אחת' : `${visual.ones} קוביות`}` : ''}`} dir="ltr">
          <span class="pic-rods">
            {Array.from({ length: visual.tens }, (_, i) => (
              <Rod key={i} />
            ))}
          </span>
          {visual.ones > 0 && (
            <span class="pic-cubes">
              {Array.from({ length: visual.ones }, (_, i) => (
                <Cube key={i} />
              ))}
            </span>
          )}
        </div>
      );
    case 'coins':
      return (
        <div class={`pic-coins ${cls}`} role="img" aria-label={`מטבעות: ${visual.coins.map(coinName).join(', ')}`} dir="ltr">
          {visual.coins.map((v, i) => (
            <Coin key={i} value={v} />
          ))}
        </div>
      );
    case 'clock':
      return (
        <div class={`pic-clock ${cls}`}>
          <ClockFace h={visual.h} m={visual.m} label={`שעון שמראה ${timeWords(visual)}`} />
        </div>
      );
  }
}
