// compare.to10 – which sign goes between two numbers: <, > or =.
// Only three signs exist, so a comparison has two wrong choices (the opposite sign and the other
// one), not three like the number skills.
import type { ErrorTag, Generator, Sign } from '../types';

export const compare: Generator = (level, rng) => {
  const lo = Math.max(1, level.min);
  const a = rng.int(lo, level.max);
  // About one question in five has equal numbers.
  const b = rng.next() < 0.2 ? a : rng.int(lo, level.max);
  const answer: Sign = a > b ? '>' : a < b ? '<' : '=';
  const errorTags: Record<string, ErrorTag> = {};
  let distractors: Sign[];
  if (answer === '=') {
    distractors = rng.shuffle<Sign>(['<', '>']);
    for (const d of distractors) errorTags[d] = 'not-equal';
  } else {
    const opposite: Sign = answer === '>' ? '<' : '>';
    distractors = [opposite, '='];
    errorTags[opposite] = 'reversed-sign';
    errorTags['='] = 'not-equal';
  }
  const visual = { kind: 'dots' as const, groups: [a, b], between: '?' };
  const big = Math.max(a, b);
  return {
    prompt: {
      text: 'איזה סימן מתאים?',
      math: `${a} ? ${b}`,
      visual,
      speech: `איזה סימן מתאים בין ${a} ל-${b}?`
    },
    answer,
    distractors,
    errorTags,
    hints: [
      answer === '='
        ? { text: 'כשבשתי הקבוצות יש אותו מספר, זה שווה.', visual: { ...visual, numbered: true } }
        : { text: `הצד הפתוח של הסימן פונה אל המספר הגדול, ${big}.`, visual: { ...visual, numbered: true } }
    ],
    explanation:
      answer === '='
        ? [{ text: `${a} ו-${b} הם אותו מספר.`, math: `${a} = ${b}` }]
        : [{ text: `${big} גדול יותר.`, math: `${a} ${answer} ${b}` }],
    numeric: false,
    key: `${a}?${b}`
  };
};
