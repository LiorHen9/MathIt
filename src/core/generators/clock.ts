// clock – telling the time on an analog clock (phase 7): level 1 whole hours, level 2 half past,
// level 3 quarter past and quarter to. The answer is a time ({h, m}); Pop asks "what time is it?"
// under a clock, the clock template asks to set the hands (Question.prompts.clock).
// Smart wrong answers: 'hands-swapped' (the long hand read as the hour: 3:00 → 12:15), an hour
// off ('near'), half past the other way ('near'). The explanation turns the hands.
import { answerKey, type ErrorTag, type Generator, type Time } from '../types';

const HOURS = ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע', 'עשר', 'אחת-עשרה', 'שתים-עשרה'];
const HOURS_TO = ['', 'לאחת', 'לשתיים', 'לשלוש', 'לארבע', 'לחמש', 'לשש', 'לשבע', 'לשמונה', 'לתשע', 'לעשר', 'לאחת-עשרה', 'לשתים-עשרה'];
const wrap = (h: number) => ((((h - 1) % 12) + 12) % 12) + 1;

/** A time in Hebrew words: "שלוש וחצי", "רבע לארבע", "שלוש ועשרים". */
export function timeWords(t: Time): string {
  if (t.m === 0) return HOURS[t.h];
  if (t.m === 30) return `${HOURS[t.h]} וחצי`;
  if (t.m === 15) return `${HOURS[t.h]} ורבע`;
  if (t.m === 45) return `רבע ${HOURS_TO[wrap(t.h + 1)]}`;
  return `${HOURS[t.h]} ו-${t.m} דקות`;
}

/** What a child reads with the hands the other way round (the long hand as the hour). */
export function handsSwapped(t: Time): Time {
  // The long hand points at m/5; the short one at about h (a little past for half past).
  const h = t.m === 0 ? 12 : t.m / 5;
  return { h, m: (t.h % 12) * 5 };
}

export const clock: Generator = (level, rng) => {
  const ms = level.level === 1 ? [0] : level.level === 2 ? [0, 30, 30] : [15, 45, 30, 15, 45];
  const t: Time = { h: rng.int(1, 12), m: rng.pick(ms) };
  const errorTags: Record<string, ErrorTag> = {};
  const distractors: Time[] = [];
  const add = (x: Time, tag: ErrorTag) => {
    const k = answerKey(x);
    if (distractors.length >= 3 || k === answerKey(t) || errorTags[k]) return;
    distractors.push(x);
    errorTags[k] = tag;
  };
  add(handsSwapped(t), 'hands-swapped');
  const later = rng.next() < 0.5;
  add({ h: wrap(t.h + (later ? 1 : -1)), m: t.m }, 'near');
  if (t.m === 45) add({ h: wrap(t.h + 1), m: 15 }, 'near');
  if (t.m === 15) add({ h: t.h, m: 45 }, 'near');
  if (t.m === 30) add({ h: wrap(t.h + 1), m: 30 }, 'near');
  add({ h: wrap(t.h + (later ? -1 : 1)), m: t.m }, 'near');
  add({ h: t.h, m: t.m === 0 ? 30 : 0 }, 'near');
  const turn = { kind: 'clock' as const, h: t.h, m: t.m };
  const words = timeWords(t);
  const hourHint = t.m === 45 ? `המחוג הקצר כמעט הגיע ל-${wrap(t.h + 1)}.` : t.m === 0 ? `המחוג הקצר על ${t.h}.` : `המחוג הקצר עבר את ${t.h}.`;
  const minuteHint = t.m === 0 ? 'המחוג הארוך על 12: שעה עגולה.' : t.m === 30 ? 'המחוג הארוך על 6: חצי שעה.' : t.m === 15 ? 'המחוג הארוך על 3: רבע.' : 'המחוג הארוך על 9: רבע לשעה הבאה.';
  const shown = answerKey(t);
  return {
    prompt: { text: 'מה השעה?', visual: { kind: 'clock', h: t.h, m: t.m }, speech: 'מה השעה בשעון?' },
    answer: t,
    distractors,
    errorTags,
    hints: [
      { text: `${hourHint} ${minuteHint}`.replace('. ', ', '), action: turn },
      { for: ['hands-swapped'], text: 'המחוג הקצר מראה את השעה, והארוך את הדקות.', action: turn },
      { for: ['near'], text: hourHint, action: turn }
    ],
    explanation: [
      { text: `${hourHint}`, action: turn },
      { text: minuteHint },
      { text: `השעה ${words}.`, math: shown }
    ],
    numeric: false,
    key: `clock:${shown}`,
    prompts: {
      clock: { text: 'מזיזים את המחוגים לשעה:', math: shown, speech: `מזיזים את המחוגים לשעה ${words}.` }
    }
  };
};
