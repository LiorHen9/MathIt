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
  },
  // ---------- Phase 7: grades 1–2 ----------
  {
    skillId: 'add.within20',
    title: 'חיבור עד 20',
    parts: [
      {
        kind: 'watch',
        title: 'עשר ועוד',
        steps: [
          { text: '13 זה עשר ועוד 3.', action: { kind: 'tens', tens: 1, ones: 3 } },
          { text: 'מוסיפים עוד 4 קוביות: 14, 15, 16, 17.', action: { kind: 'tens', tens: 1, ones: 3, add: 4 } },
          { text: 'יוצא 17.', math: '13 + 4 = 17' }
        ]
      },
      { kind: 'try', title: 'כמה זה?', level: 1, key: '12+5' },
      {
        kind: 'watch',
        title: 'על הציר עד 20',
        steps: [
          { text: 'מ-14 קופצים 3 קדימה.', action: { kind: 'line', from: 14, hops: [3], max: 20 } },
          { text: 'נוחתים על 17.', math: '14 + 3 = 17' }
        ]
      },
      { kind: 'try', title: 'עוד אחד', level: 1, key: '15+3' }
    ]
  },
  {
    skillId: 'sub.within20',
    title: 'חיסור עד 20',
    parts: [
      {
        kind: 'watch',
        title: 'מורידים קוביות',
        steps: [
          { text: '17 זה עשר ועוד 7.', action: { kind: 'tens', tens: 1, ones: 7 } },
          { text: 'מורידים 4 קוביות.', action: { kind: 'tens', tens: 1, ones: 7, take: 4 } },
          { text: 'נשארו 13.', math: '17 − 4 = 13' }
        ]
      },
      { kind: 'try', title: 'כמה נשארו?', level: 1, key: '16-3' },
      {
        kind: 'watch',
        title: 'קופצים אחורה',
        steps: [
          { text: 'מ-18 קופצים 5 אחורה.', action: { kind: 'line', from: 18, hops: [-5], max: 20 } },
          { text: 'נוחתים על 13.', math: '18 − 5 = 13' }
        ]
      },
      { kind: 'try', title: 'עוד אחד', level: 1, key: '19-6' }
    ]
  },
  {
    skillId: 'add.bridge10',
    title: 'משלימים ל-10',
    parts: [
      {
        kind: 'watch',
        title: 'מסגרת עשר כפולה',
        steps: [
          { text: '8 ועוד 5: קודם יש 8 במסגרת.', action: { kind: 'tenFrame', n: 8 } },
          { text: '2 משלימים ל-10, ו-3 עוברים למסגרת השנייה.', action: { kind: 'doubleFrame', a: 8, b: 5 } },
          { text: '10 ועוד 3 זה 13.', math: '8 + 2 + 3 = 13' }
        ]
      },
      { kind: 'try', title: 'כמה זה?', level: 1, key: '9+4' },
      {
        kind: 'watch',
        title: 'דרך ה-10 על הציר',
        steps: [
          { text: 'מ-7 קופצים 3 עד 10, ומשם עוד 3.', action: { kind: 'line', from: 7, hops: [3, 3], max: 20 } },
          { text: 'נוחתים על 13.', math: '7 + 6 = 13' }
        ]
      },
      { kind: 'try', title: 'עוד אחד', level: 2, key: '7+5' }
    ]
  },
  {
    skillId: 'sub.bridge10',
    title: 'חיסור דרך ה-10',
    parts: [
      {
        kind: 'watch',
        title: 'קודם עד 10',
        steps: [
          { text: '13 פחות 5: קודם מורידים 3 ומגיעים ל-10.', action: { kind: 'line', from: 13, hops: [-3], max: 20 } },
          { text: 'ומ-10 מורידים עוד 2.', action: { kind: 'doubleFrame', a: 13, b: -5 } },
          { text: 'נשארו 8.', math: '13 − 3 − 2 = 8' }
        ]
      },
      { kind: 'try', title: 'כמה זה?', level: 1, key: '12-5' },
      {
        kind: 'watch',
        title: 'על הציר',
        steps: [
          { text: 'מ-15 קופצים 5 עד 10, ועוד 2.', action: { kind: 'line', from: 15, hops: [-5, -2], max: 20 } },
          { text: 'נוחתים על 8.', math: '15 − 7 = 8' }
        ]
      },
      { kind: 'try', title: 'עוד אחד', level: 2, key: '16-8' }
    ]
  },
  {
    skillId: 'story.within20',
    title: 'סיפורים עד 20',
    parts: [
      {
        kind: 'watch',
        title: 'מקבלים עוד',
        steps: [
          { text: 'בסיפור יש 8, ומקבלים עוד 5.', action: { kind: 'doubleFrame', a: 8, b: 5 } },
          { text: 'כשמקבלים – מחברים: 8 ועוד 5 זה 13.', math: '8 + 5 = 13' }
        ]
      },
      { kind: 'try', title: 'עכשיו סיפור', level: 1, key: 'story1:12+5' },
      {
        kind: 'watch',
        title: 'נותנים',
        steps: [
          { text: 'היו 14, ונתנו 6.', action: { kind: 'doubleFrame', a: 14, b: -6 } },
          { text: 'כשנותנים – מחסרים: נשארו 8.', math: '14 − 6 = 8' }
        ]
      },
      { kind: 'try', title: 'עוד סיפור', level: 2, key: 'story0:9+4' }
    ]
  },
  {
    skillId: 'numbers.to100',
    title: 'מספרים עד 100',
    parts: [
      {
        kind: 'watch',
        title: 'סופרים בעשרות',
        steps: [
          { text: 'כל מוט הוא 10: 10, 20, 30, 40.', action: { kind: 'tens', tens: 4, ones: 0 } },
          { text: '4 מוטות הם 40.', math: '40' }
        ]
      },
      {
        kind: 'watch',
        title: 'מוטות וקוביות',
        steps: [
          { text: '4 מוטות ועוד 7 קוביות.', action: { kind: 'tens', tens: 4, ones: 7 } },
          { text: '40 ועוד 7 זה 47.', math: '40 + 7 = 47' }
        ]
      },
      { kind: 'try', title: 'כמה קוביות?', level: 2, key: 'n100:count:23' },
      {
        kind: 'watch',
        title: 'מה בא אחרי?',
        steps: [
          { text: 'אחרי 39 בא 40: עשרת שלמה!', action: { kind: 'line', from: 39, hops: [1], max: 100 } },
          { text: '39 ואחריו 40.', math: '39, 40' }
        ]
      },
      { kind: 'try', title: 'מה בא אחרי?', level: 3, key: 'n100:after:59' }
    ]
  },
  {
    skillId: 'place.value',
    title: 'עשרות ואחדות',
    parts: [
      {
        kind: 'watch',
        title: 'עשר קוביות הן מוט',
        steps: [
          { text: '10 קוביות נצמדות למוט אחד: עשרת.', action: { kind: 'tens', tens: 0, ones: 10 } },
          { text: 'מוט אחד הוא 10.', math: '10' }
        ]
      },
      {
        kind: 'watch',
        title: 'עשרות משמאל',
        steps: [
          { text: '2 עשרות ו-7 אחדות.', action: { kind: 'tens', tens: 2, ones: 7 } },
          { text: 'העשרות נכתבות משמאל: 27.', math: '27' }
        ]
      },
      { kind: 'try', title: 'איזה מספר?', level: 1, key: 'pv:make:34' },
      {
        kind: 'watch',
        title: 'כמה עשרות?',
        steps: [
          { text: 'ב-27 יש 2 מוטות: 2 עשרות.', action: { kind: 'tens', tens: 2, ones: 7, ask: 'tens' } },
          { text: 'הספרה השמאלית היא העשרות.', math: '2' }
        ]
      },
      { kind: 'try', title: 'עכשיו תורך', level: 2, key: 'pv:tens:58' }
    ]
  },
  {
    skillId: 'pattern',
    title: 'סדרות',
    parts: [
      {
        kind: 'watch',
        title: 'קופצים ב-2',
        steps: [
          { text: '2, 4, 6, 8: בכל פעם קופצים 2.', action: { kind: 'line', from: 2, hops: [2, 2, 2], max: 20 } },
          { text: 'אחרי 8 בא 10.', action: { kind: 'line', from: 2, hops: [2, 2, 2, 2], max: 20 }, math: '2, 4, 6, 8, 10' }
        ]
      },
      { kind: 'try', title: 'מה הבא?', level: 1, key: 'pat:5,10,15,20,25:4' },
      {
        kind: 'watch',
        title: 'גם אחורה',
        steps: [
          { text: '20, 19, 18, 17: בכל פעם אחת אחורה.', action: { kind: 'line', from: 20, hops: [-1, -1, -1, -1], max: 20 } },
          { text: 'אחרי 17 בא 16.', math: '20, 19, 18, 17, 16' }
        ]
      },
      { kind: 'try', title: 'עוד סדרה', level: 2, key: 'pat:30,28,26,24,22:4' }
    ]
  },
  {
    skillId: 'money',
    title: 'כסף',
    parts: [
      {
        kind: 'watch',
        title: 'סופרים מטבעות',
        steps: [
          { text: 'כל מטבע שווה מה שכתוב עליו.', action: { kind: 'coins', coins: [5, 2, 1] } },
          { text: '5 ועוד 2 ועוד 1 זה 8 שקלים.', math: '8 ₪' }
        ]
      },
      { kind: 'try', title: 'כמה כסף?', level: 1, key: 'money:5+2+2' },
      {
        kind: 'watch',
        title: 'עודף',
        steps: [
          { text: 'משלמים 10 על משהו שעולה 7: סופרים מ-7 עד 10.', action: { kind: 'line', from: 7, hops: [3], max: 20 } },
          { text: 'העודף: 2 ועוד 1.', action: { kind: 'coins', coins: [2, 1] } },
          { text: 'מקבלים 3 שקלים עודף.', math: '10 − 7 = 3' }
        ]
      },
      { kind: 'try', title: 'כמה עודף?', level: 3, key: 'change:10-6' }
    ]
  },
  {
    skillId: 'clock',
    title: 'השעון',
    parts: [
      {
        kind: 'watch',
        title: 'שעה עגולה',
        steps: [
          { text: 'המחוג הקצר מראה את השעה: 3.', action: { kind: 'clock', h: 3, m: 0 } },
          { text: 'הארוך על 12: שלוש בדיוק.', math: '3:00' }
        ]
      },
      {
        kind: 'watch',
        title: 'וחצי',
        steps: [
          { text: 'המחוג הארוך עושה חצי סיבוב, עד 6.', action: { kind: 'clock', h: 3, m: 30 } },
          { text: 'השעה שלוש וחצי.', math: '3:30' }
        ]
      },
      { kind: 'try', title: 'מה השעה?', level: 1, key: 'clock:5:00' },
      { kind: 'try', title: 'ועכשיו?', level: 2, key: 'clock:7:30' }
    ]
  },
  {
    skillId: 'add.within100',
    title: 'חיבור עד 100',
    parts: [
      {
        kind: 'watch',
        title: 'עשרות ועוד עשרות',
        steps: [
          { text: '30 ועוד 40: 3 מוטות ועוד 4 מוטות.', action: { kind: 'tens', tens: 3, ones: 0, add: 40 } },
          { text: '7 מוטות הם 70.', math: '30 + 40 = 70' }
        ]
      },
      { kind: 'try', title: 'כמה זה?', level: 1, key: '30+40' },
      {
        kind: 'watch',
        title: 'עשר קוביות נצמדות',
        steps: [
          { text: '38 ועוד 25: מוטות למוטות, קוביות לקוביות.', action: { kind: 'tens', tens: 3, ones: 8, add: 25 } },
          { text: '10 קוביות נצמדו למוט: יוצא 63.', math: '38 + 25 = 63' }
        ]
      },
      { kind: 'try', title: 'עוד אחד', level: 1, key: '47+20' }
    ]
  },
  {
    skillId: 'sub.within100',
    title: 'חיסור עד 100',
    parts: [
      {
        kind: 'watch',
        title: 'מורידים מוטות',
        steps: [
          { text: '70 פחות 30: מורידים 3 מוטות.', action: { kind: 'tens', tens: 7, ones: 0, take: 30 } },
          { text: 'נשארו 40.', math: '70 − 30 = 40' }
        ]
      },
      { kind: 'try', title: 'כמה זה?', level: 1, key: '80-30' },
      {
        kind: 'watch',
        title: 'פורטים עשרת',
        steps: [
          { text: '52 פחות 17: אין מספיק קוביות, אז מוט נפרט ל-10.', action: { kind: 'tens', tens: 5, ones: 2, take: 17 } },
          { text: 'נשארו 35.', math: '52 − 17 = 35' }
        ]
      },
      { kind: 'try', title: 'עוד אחד', level: 1, key: '65-20' }
    ]
  }
];

export function getLesson(skillId: string): Lesson | undefined {
  return LESSONS.find((l) => l.skillId === skillId);
}
