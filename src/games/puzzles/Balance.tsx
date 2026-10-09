// The balance board (phase 9): a beam on a stand, weights on both pans and one or two boxes of the
// same unknown weight on the left. Tap a weight from the tray to try it in the box(es): the beam
// tips toward the heavier side, or stays level – solved. A weight that does not balance is a slip
// (it goes back, marked). Hints: first the sums on both pans, then what is missing.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { balanceDiff, makeBalance } from '../../core/puzzles/balance';
import { emit } from '../../fx/director';
import type { PuzzleProps } from './types';

export function Balance({ level, seed, hint, onHintText, onMistake, onSolved, onTask }: PuzzleProps) {
  const p = useMemo(() => makeBalance(level, seed), [level, seed]);
  const [w, setW] = useState<number | null>(null);
  const [tried, setTried] = useState<number[]>([]);
  const [sums, setSums] = useState(false);
  const [done, setDone] = useState(false);
  const diff = w === null ? -1 : balanceDiff(p, w);
  // Tilt: the heavier side goes down (left side down = negative angle, the beam is LTR).
  const tilt = w === null ? (balanceDiff(p, 0) < 0 ? 8 : -8) : diff === 0 ? 0 : diff > 0 ? -8 : 8;
  const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
  useEffect(() => onTask(p.boxes === 2 ? 'שתי הקופסאות שוקלות אותו דבר: כמה שוקלת כל קופסה כדי שהמאזניים יתאזנו?' : 'כמה שוקלת הקופסה כדי שהמאזניים יתאזנו?'), [p]);

  useEffect(() => {
    if (!hint || done) return;
    if (!sums) {
      setSums(true);
      onHintText(`בצד ימין ${sum(p.right)}, ובצד שמאל כבר יש ${sum(p.left)}.`);
    } else onHintText(p.boxes === 2 ? `חסרים ${sum(p.right) - sum(p.left)}, ומחלקים לשתי קופסאות.` : `חסרים ${sum(p.right) - sum(p.left)}.`);
  }, [hint]);

  function tryWeight(x: number, el: Element) {
    if (done || tried.includes(x)) return;
    setW(x);
    emit({ type: 'tap', key: x % 10 });
    if (balanceDiff(p, x) === 0) {
      setDone(true);
      window.setTimeout(() => onSolved(document.querySelector('.bl-scale')), 450);
    } else {
      setTried([...tried, x]);
      window.setTimeout(() => {
        onMistake(el);
        setW(null);
      }, 700);
    }
  }

  return (
    <div class="puzzle-balance" data-solution={p.answer} data-diff={diff}>
      <div class="bl-scale" dir="ltr" data-tilt={tilt}>
        <div class="bl-beam" style={`transform: rotate(${tilt}deg)`}>
          <div class="bl-pan bl-left" style={`transform: rotate(${-tilt}deg)`}>
            {p.left.map((x, i) => (
              <span key={i} class="bl-weight">
                {x}
              </span>
            ))}
            {Array.from({ length: p.boxes }, (_, i) => (
              <span key={`b${i}`} class={`bl-box ${w !== null ? 'is-full' : ''}`} data-testid={`balance-box-${i}`}>
                {w ?? '?'}
              </span>
            ))}
            {sums && <span class="bl-sum">{w === null ? `${sum(p.left)} + ${p.boxes === 2 ? '2 × ?' : '?'}` : sum(p.left) + p.boxes * w}</span>}
          </div>
          <div class="bl-pan bl-right" style={`transform: rotate(${-tilt}deg)`}>
            {p.right.map((x, i) => (
              <span key={i} class="bl-weight">
                {x}
              </span>
            ))}
            {sums && <span class="bl-sum">{sum(p.right)}</span>}
          </div>
        </div>
        <div class="bl-stand" />
      </div>
      <div class="mg-tray" dir="ltr" role="group" aria-label="משקולות לנסות">
        {p.tray.map((x) => (
          <button type="button" key={x} class={`pt-tile bl-try ${tried.includes(x) ? 'is-wrong' : ''}`} data-value={x} data-testid={`balance-try-${x}`} disabled={done || tried.includes(x)} onClick={(e) => tryWeight(x, e.currentTarget)}>
            {x}
          </button>
        ))}
      </div>
    </div>
  );
}
