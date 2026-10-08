// Lessons, as data (docs/ARCHITECTURE.md §6.1, §7.3): 3–5 short screens per skill. A "watch"
// screen is an animated explanation (the same Steps and Actions the hints use); a "try" screen
// is one question – "your turn" – with the full feedback, hints and explanation of a round.
// Only data here: screens/Lesson.tsx draws it. tests/core/check.ts checks every lesson.
// The texts are neutral Hebrew (the screen adds "עכשיו תורך" and the gendered bits).
import type { SkillId, Step } from '../types';

export type LessonPart =
  | { kind: 'watch'; title: string; steps: Step[] }
  /** One question: the exercise with this key (`findQuestion`) at this level. */
  | { kind: 'try'; title: string; level: number; key: string };

export interface Lesson {
  skillId: SkillId;
  /** "מה זה חיבור?" */
  title: string;
  parts: LessonPart[];
}

export const LESSONS: readonly Lesson[] = [
  {
    skillId: 'count.to10',
    title: 'איך סופרים?',
    parts: [
      {
        kind: 'watch',
        title: 'כל כוכב מקבל מספר',
        steps: [
          { text: 'סופרים כל כוכב פעם אחת: 1, 2, 3.', action: { kind: 'count', n: 3 } },
          { text: 'המספר האחרון אומר כמה יש: 3 כוכבים.', math: '3' }
        ]
      },
      {
        kind: 'watch',
        title: 'מסגרת עשר',
        steps: [
          { text: 'במסגרת עשר לכל כוכב יש משבצת משלו.', action: { kind: 'tenFrame', n: 7 } },
          { text: 'שורה מלאה היא 5, ועוד 2 זה 7.', math: '7' }
        ]
      },
      { kind: 'try', title: 'כמה כוכבים?', level: 1, key: 'count:4' },
      {
        kind: 'watch',
        title: 'עשר שלם',
        steps: [{ text: 'כשכל המשבצות מלאות, יש בדיוק 10.', action: { kind: 'tenFrame', n: 10 }, math: '10' }]
      },
      { kind: 'try', title: 'עוד פעם', level: 2, key: 'count:6' }
    ]
  },
  {
    skillId: 'compare.to10',
    title: 'גדול, קטן או שווה?',
    parts: [
      {
        kind: 'watch',
        title: 'מסדרים זוגות',
        steps: [
          { text: 'מסדרים זוגות, אחד מול אחד.', action: { kind: 'compare', a: 4, b: 2 } },
          { text: 'למעלה נשארו שניים בלי זוג, אז 4 גדול מ-2.', math: '4 > 2' }
        ]
      },
      {
        kind: 'watch',
        title: 'הסימן',
        steps: [
          { text: 'הצד הפתוח של הסימן פונה אל המספר הגדול.', math: '4 > 2' },
          { text: 'כשלכולם יש זוג, זה שווה.', action: { kind: 'compare', a: 3, b: 3 }, math: '3 = 3' }
        ]
      },
      { kind: 'try', title: 'איזה סימן?', level: 1, key: '5?2' },
      { kind: 'try', title: 'ועכשיו?', level: 1, key: '1?4' }
    ]
  },
  {
    skillId: 'add.within10',
    title: 'מה זה חיבור?',
    parts: [
      {
        kind: 'watch',
        title: 'חיבור זה לשים יחד',
        steps: [
          { text: 'יש 2 ועוד 1. שמים אותם יחד.', action: { kind: 'combine', a: 2, b: 1 } },
          { text: 'עכשיו יש 3.', math: '2 + 1 = 3' }
        ]
      },
      {
        kind: 'watch',
        title: 'סופרים מהגדול',
        steps: [
          { text: 'יש 4 ועוד 2. מתחילים מ-4 וסופרים עוד 2: 5, 6.', action: { kind: 'combine', a: 4, b: 2 } },
          { text: 'יוצא 6.', math: '4 + 2 = 6' }
        ]
      },
      { kind: 'try', title: 'כמה זה?', level: 1, key: '3+2' },
      {
        kind: 'watch',
        title: 'ציר המספרים',
        steps: [
          { text: 'אפשר גם לקפוץ על ציר המספרים: מתחילים ב-5 וקופצים 3 קדימה.', action: { kind: 'jump', from: 5, by: 3 } },
          { text: 'נוחתים על 8.', math: '5 + 3 = 8' }
        ]
      },
      { kind: 'try', title: 'עוד אחד', level: 2, key: '4+3' }
    ]
  },
  {
    skillId: 'sub.within10',
    title: 'מה זה חיסור?',
    parts: [
      {
        kind: 'watch',
        title: 'חיסור זה להוריד',
        steps: [
          { text: 'היו 5, ו-2 עפו.', action: { kind: 'takeAway', a: 5, b: 2 } },
          { text: 'נשארו 3.', math: '5 − 2 = 3' }
        ]
      },
      { kind: 'try', title: 'כמה נשארו?', level: 1, key: '4-1' },
      {
        kind: 'watch',
        title: 'קופצים אחורה',
        steps: [
          { text: 'על ציר המספרים קופצים אחורה: מתחילים ב-7 וקופצים 3 אחורה.', action: { kind: 'jump', from: 7, by: -3 } },
          { text: 'נוחתים על 4.', math: '7 − 3 = 4' }
        ]
      },
      { kind: 'try', title: 'עוד אחד', level: 2, key: '6-2' }
    ]
  },
  {
    skillId: 'story.within10',
    title: 'סיפור של חשבון',
    parts: [
      {
        kind: 'watch',
        title: 'מוסיפים בסיפור',
        steps: [
          { text: 'בסיפור יש 3, ומוסיפים עוד 2.', action: { kind: 'combine', a: 3, b: 2 } },
          { text: 'כשמוסיפים – מחברים: 3 ועוד 2 זה 5.', math: '3 + 2 = 5' }
        ]
      },
      { kind: 'try', title: 'עכשיו סיפור', level: 1, key: 'story0:2+2' },
      {
        kind: 'watch',
        title: 'לוקחים בסיפור',
        steps: [
          { text: 'היו 6, ולקחו 2.', action: { kind: 'takeAway', a: 6, b: 2 } },
          { text: 'כשלוקחים – מחסרים: נשארו 4.', math: '6 − 2 = 4' }
        ]
      },
      { kind: 'try', title: 'עוד סיפור', level: 2, key: 'story0:7-3' }
    ]
  }
];

export function getLesson(skillId: string): Lesson | undefined {
  return LESSONS.find((l) => l.skillId === skillId);
}
