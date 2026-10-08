// Build (בנייה, docs/ARCHITECTURE.md §4.3): the child builds the answer and checks it.
// - Numbers: tens rods and ones cubes. "+ מוט" / "+ קובייה" add one, "−" takes one away; the
//   tenth loose cube makes the ten cubes snap into a rod (the "ten" chord) – regrouping, felt.
// - Money (a question with the ₪ unit): coins onto a tray (games/CoinTray.tsx).
// "בדוק ✓" reports the value built. After a wrong check the build stays, to be fixed (checking
// the same value again is not possible). The world dresses the pieces (World.templateSkins.build).
// Every question played here has its own build prompt ("בונים את המספר 47"; core Question.prompts).
import { useRef, useState } from 'preact/hooks';
import { answerKey } from '../core/types';
import { emit } from '../fx/director';
import { pop } from '../fx/motion';
import { Cube, Rod } from '../ui/art';
import { useWorld } from '../worlds/index';
import { CoinTray, coinTotal } from './CoinTray';
import { PromptCard, type TemplateProps } from './PromptCard';

export function Build({ question: q, done, tried, reveal, hint, earlyHint, explaining, onAnswer }: TemplateProps) {
  const look = useWorld().templateSkins?.build?.look ?? 'crystal';
  const money = q.unit === '₪';
  const [tens, setTens] = useState(0);
  const [ones, setOnes] = useState(0);
  const [coins, setCoins] = useState<number[]>([]);
  const board = useRef<HTMLDivElement>(null);
  const value = money ? coinTotal(coins) : tens * 10 + ones;
  const off = done || reveal;
  const triedThis = tried.some((t) => answerKey(t) === answerKey(value));

  function addOne() {
    if (value >= 100) return;
    if (ones === 9) {
      // Ten loose cubes snap into a rod.
      setOnes(0);
      setTens(tens + 1);
      emit({ type: 'ten' });
      requestAnimationFrame(() => pop(board.current?.querySelector('.bd-rods .bd-piece:last-child')));
      return;
    }
    setOnes(ones + 1);
    emit({ type: 'count', n: ones + 1 });
  }

  function addTen() {
    if (value + 10 > 100) return;
    setTens(tens + 1);
    emit({ type: 'leap', n: (tens + 1) * 10 });
  }

  const check = (
    <button
      type="button"
      class="btn btn-primary bd-check"
      data-testid="build-check"
      disabled={off || value <= 0 || triedThis}
      onClick={(e) => onAnswer(value, board.current ?? e.currentTarget)}
    >
      בדוק ✓
    </button>
  );

  return (
    <div class="build">
      <PromptCard question={q} done={done} reveal={reveal} hint={hint} earlyHint={earlyHint} explaining={explaining} noPicture={!!q.prompts?.build} />
      {!explaining &&
        (money ? (
          <div class={`bd-money skin-${look}`} data-skin={look} ref={board}>
            <CoinTray coins={coins} onChange={setCoins} values={Number.isInteger(q.answer as number) ? [10, 5, 2, 1] : [10, 5, 2, 1, 0.5]} disabled={off} label="שמים כאן מטבעות" />
            {check}
          </div>
        ) : (
          <div class={`bd-blocks skin-${look}`} data-skin={look}>
            <div class="bd-board" ref={board} role="img" aria-label={`נבנה: ${tens} מוטות ו-${ones} קוביות, ${value}`} dir="ltr" data-testid="build-board" data-value={value}>
              <span class="bd-rods">
                {Array.from({ length: tens }, (_, i) => (
                  <span key={i} class="bd-piece">
                    <Rod />
                  </span>
                ))}
              </span>
              <span class="bd-cubes">
                {Array.from({ length: ones }, (_, i) => (
                  <span key={i} class="bd-piece">
                    <Cube />
                  </span>
                ))}
              </span>
              {value === 0 && <span class="bd-empty">בונים כאן</span>}
            </div>
            <p class="bd-value" dir="ltr" data-testid="build-value">
              {value}
            </p>
            <div class="bd-controls" dir="ltr">
              <button type="button" class="btn btn-secondary bd-btn" data-testid="add-rod" aria-label="להוסיף מוט של עשר" disabled={off || value + 10 > 100} onClick={addTen}>
                + <Rod cls="bd-icon" />
              </button>
              <button type="button" class="btn btn-secondary bd-btn" data-testid="add-cube" aria-label="להוסיף קובייה" disabled={off || value >= 100} onClick={addOne}>
                + <Cube cls="bd-icon" />
              </button>
              <button
                type="button"
                class="btn btn-ghost bd-btn"
                data-testid="remove-rod"
                aria-label="להוריד מוט"
                disabled={off || tens === 0}
                onClick={() => {
                  emit({ type: 'tap' });
                  setTens(tens - 1);
                }}
              >
                − <Rod cls="bd-icon" />
              </button>
              <button
                type="button"
                class="btn btn-ghost bd-btn"
                data-testid="remove-cube"
                aria-label="להוריד קובייה"
                disabled={off || ones === 0}
                onClick={() => {
                  emit({ type: 'tap' });
                  setOnes(ones - 1);
                }}
              >
                − <Cube cls="bd-icon" />
              </button>
            </div>
            {check}
          </div>
        ))}
    </div>
  );
}
