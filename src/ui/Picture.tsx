// A question's picture (core/types Visual): stars (ui/Dots.tsx), tens rods and ones cubes, coins,
// a clock; phase 9 a pizza, a shape on squared paper, a square of 100. Static – the animated versions are the manipulatives.
import type { Visual } from '../core/types';
import { Dots } from './Dots';
import { ClockFace, Coin, Cube, Rod, coinName } from './art';
import { timeWords } from '../core/generators/clock';
import { PizzaPic } from './Pizza';
import { GridShape } from './Grid';
import './phase9.css';

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
    // Phase 9.
    case 'pizza':
      return (
        <div class={`pic-pizza ${cls}`}>
          <PizzaPic n={visual.n} d={visual.d} />
        </div>
      );
    case 'grid': {
      const cell = Math.max(14, Math.min(28, Math.floor(250 / visual.w), Math.floor(170 / visual.h)));
      return (
        <div class={`pic-grid ${cls}`} role="img" aria-label={visual.cut ? 'צורה על דף משבצות' : `מלבן ${visual.w} על ${visual.h}`} dir="ltr">
          <GridShape w={visual.w} h={visual.h} cut={visual.cut} cell={cell} sides={visual.sides} squares={!visual.sides} hideFill={false} />
        </div>
      );
    }
    case 'hundred':
      return (
        <div class={`pic-hundred ${cls}`} role="img" aria-label={`ריבוע של מאה, ${visual.n} משבצות צבועות`} dir="ltr">
          <span class="dc-square">
            {Array.from({ length: 100 }, (_, i) => (
              <span key={i} class={`dc-cell ${i < visual.n ? 'is-1' : ''}`} style={`grid-column:${Math.floor(i / 10) + 1}; grid-row:${(i % 10) + 1}`} />
            ))}
          </span>
        </div>
      );
    case 'column':
      // Drawn by the question card in place of the exercise line (games/PromptCard.tsx).
      return null;
  }
}
