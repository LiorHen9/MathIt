// money – shekels and agorot (phase 7). Level 1: count coins of 1, 2 and 5 (up to 10 ₪); level 2:
// coins of 10 too (up to 30 ₪); level 3: simple change from 10 or 20 ₪, and fifty agorot.
// Every question also says how to play it in the shop and in the build template ("pay exactly";
// "give the change"): the same answer, built from coins (Question.prompts).
// Smart wrong answers: the number of coins instead of their value ('one-part'), one coin off,
// price + paid instead of the change ('added'), the price itself.
// The explanation stacks the coins and counts them up, biggest first.
import type { Rng } from '../rng';
import { COIN_VALUES, moneyText, type ErrorTag, type Generator, type PromptParts } from '../types';
import { numberDistractors } from './common';

/** Coins for an amount, biggest first (the fewest coins). */
export function coinsFor(amount: number, values: readonly number[] = COIN_VALUES): number[] {
  const out: number[] = [];
  let left = Math.round(amount * 2) / 2;
  for (const v of values)
    while (left >= v - 1e-9) {
      out.push(v);
      left = Math.round((left - v) * 2) / 2;
    }
  return out;
}

const sum = (cs: number[]) => Math.round(cs.reduce((a, c) => a + c, 0) * 2) / 2;
const spoken = (n: number) => (Number.isInteger(n) ? `${n} שקלים` : `${Math.floor(n)} שקלים ו-50 אגורות`);

/** A handful of coins of these values, worth at most `max`. */
function handful(rng: Rng, values: number[], max: number, count: [number, number]): number[] {
  for (let t = 0; t < 50; t++) {
    const n = rng.int(count[0], count[1]);
    const cs = Array.from({ length: n }, () => rng.pick(values)).sort((a, b) => b - a);
    if (sum(cs) <= max && new Set(cs).size > 1) return cs;
  }
  return [values[0], values.at(-1)!];
}

export const money: Generator = (level, rng) => {
  if (level.level === 3 && rng.next() < 0.6) return change(level, rng);
  const values = level.level === 1 ? [5, 2, 1] : level.level === 2 ? [10, 5, 2, 1] : [5, 2, 1, 0.5];
  const coins = handful(rng, values, level.max, level.level === 1 ? [2, 4] : [3, 5]);
  const total = sum(coins);
  const half = !Number.isInteger(total) || coins.includes(0.5);
  const step = half ? 0.5 : 1;
  const { distractors, errorTags } = numberDistractors(
    total,
    [
      [coins.length, 'one-part'],
      [total + 1, half ? 'near' : 'count-off-by-one'],
      [total - 1, half ? 'near' : 'count-off-by-one'],
      [total + 0.5, 'count-off-by-one'],
      [total - 0.5, 'count-off-by-one']
    ],
    level,
    rng,
    3,
    step
  );
  const stack = { kind: 'coins' as const, coins };
  const pay: PromptParts = { text: `בונים ${moneyText(total)} ממטבעות.`, speech: `בונים ${spoken(total)} ממטבעות.` };
  const shop: PromptParts = { text: `{thing} עולה ${moneyText(total)}: משלמים בדיוק.`, speech: `{thing} עולה ${spoken(total)}: משלמים בדיוק.` };
  return {
    prompt: { text: 'כמה כסף יש כאן?', visual: { kind: 'coins', coins }, speech: 'כמה כסף יש כאן?' },
    answer: total,
    distractors,
    errorTags,
    hints: [
      { text: 'מתחילים מהמטבע הגדול וממשיכים לספור.', action: stack },
      { for: ['one-part'], text: 'סופרים כמה כל מטבע שווה, לא כמה מטבעות יש.', action: stack },
      { for: ['count-off-by-one', 'near'], text: 'מוסיפים כל מטבע בדיוק פעם אחת.', action: stack }
    ],
    explanation: [
      { text: 'מסדרים את המטבעות מהגדול לקטן וסופרים.', action: stack },
      { text: `יש ${spoken(total)}.`, math: moneyText(total) }
    ],
    numeric: !half,
    key: `money:${coins.join('+')}`,
    unit: '₪',
    prompts: { build: pay, shop }
  };
};

/** Change: paid with a 10 or 20 ₪ note-like coin(s), how much comes back? */
function change(level: Parameters<Generator>[0], rng: Rng): ReturnType<Generator> {
  const paid = rng.next() < 0.6 ? 10 : 20;
  const price = paid === 10 ? rng.int(2, 9) : rng.int(11, 18);
  const back = paid - price;
  const smart: [number, ErrorTag][] = [
    [price + paid, 'added'],
    [price, 'one-part'],
    [back + 1, 'count-off-by-one'],
    [back - 1, 'count-off-by-one']
  ];
  const { distractors, errorTags } = numberDistractors(back, smart, level, rng);
  const coins = coinsFor(back);
  const stack = { kind: 'coins' as const, coins };
  const count = { kind: 'line' as const, from: price, hops: [back], max: 20 as const };
  const text = `{thing} עולה ${moneyText(price)}, ומשלמים ${moneyText(paid)}: כמה עודף מקבלים?`;
  const speech = `{thing} עולה ${spoken(price)}, ומשלמים ${spoken(paid)}: כמה עודף מקבלים?`;
  const give: PromptParts = { text: `{thing} עולה ${moneyText(price)}, ושילמו ${moneyText(paid)}: נותנים את העודף.`, speech: `{thing} עולה ${spoken(price)}, ושילמו ${spoken(paid)}: נותנים את העודף.` };
  return {
    prompt: { text, math: `${paid} − ${price} = ?`, speech },
    answer: back,
    distractors,
    errorTags,
    hints: [
      { text: `סופרים מ-${price} עד ${paid}.`, action: count },
      { for: ['added'], text: 'העודף הוא מה שחוזר, אז מורידים את המחיר.', action: count },
      { for: ['one-part'], text: `${moneyText(price)} זה המחיר. העודף הוא מה שנשאר מ-${paid}.`, action: count },
      { for: ['count-off-by-one', 'near'], text: `מ-${price} קופצים עד ${paid} וסופרים את הקפיצות.`, action: count }
    ],
    explanation: [
      { text: `משלימים מ-${price} עד ${paid}.`, action: count },
      { text: `העודף: ${coins.map((c) => moneyText(c)).join(' ועוד ')}.`, action: stack },
      { text: `מקבלים ${spoken(back)} עודף.`, math: `${paid} − ${price} = ${back}` }
    ],
    numeric: true,
    key: `change:${paid}-${price}`,
    unit: '₪',
    prompts: { build: give, shop: give }
  };
}
