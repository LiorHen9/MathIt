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
  },
  // Phase 9: grades 3–6.
  {
    skillId: 'mul.table',
    title: 'מה זה כפל?',
    parts: [
      {
        kind: 'watch',
        title: 'שורות שוות',
        steps: [
          { text: '3 שורות, ובכל שורה 4: סופרים 4, 8, 12.', action: { kind: 'array', rows: 3, cols: 4 } },
          { text: 'כפל זה חיבור שחוזר: 4 + 4 + 4.', math: '3 × 4 = 12' }
        ]
      },
      {
        kind: 'watch',
        title: 'מסובבים',
        steps: [
          { text: 'מסובבים את המערך: עכשיו 4 שורות של 3.', action: { kind: 'array', rows: 3, cols: 4, turn: true } },
          { text: 'אותו מספר! 3 × 4 = 4 × 3.', math: '4 × 3 = 12' }
        ]
      },
      { kind: 'try', title: 'כמה זה?', level: 1, key: '4x10' },
      {
        kind: 'watch',
        title: 'קופצים בכפל',
        steps: [
          { text: 'על ציר המספרים קופצים בקפיצות של 5.', action: { kind: 'line', from: 0, hops: [5, 5, 5, 5], max: 100 } },
          { text: '4 קפיצות של 5 נוחתות על 20.', math: '4 × 5 = 20' }
        ]
      },
      { kind: 'try', title: 'עוד אחד', level: 2, key: '8x4' }
    ]
  },
  {
    skillId: 'div',
    title: 'מה זה חילוק?',
    parts: [
      {
        kind: 'watch',
        title: 'מחלקים לצלחות',
        steps: [
          { text: 'יש 12, ומחלקים שווה בשווה ל-3 צלחות.', action: { kind: 'share', total: 12, groups: 3, ask: 'each' } },
          { text: 'בכל צלחת 4.', math: '12 : 3 = 4' }
        ]
      },
      { kind: 'try', title: 'כמה בכל צלחת?', level: 1, key: '40:10' },
      {
        kind: 'watch',
        title: 'שארית',
        steps: [
          { text: '17 ל-5 צלחות: בכל צלחת 3.', action: { kind: 'share', total: 17, groups: 5, ask: 'each' } },
          { text: 'ו-2 לא מספיקים לסיבוב: זו השארית.', action: { kind: 'share', total: 17, groups: 5, ask: 'left' }, math: '17 : 5 = 3 (שארית 2)' }
        ]
      },
      { kind: 'try', title: 'עכשיו עם שארית', level: 3, key: '23:7' }
    ]
  },
  {
    skillId: 'mul.big',
    title: 'כפל של מספר גדול',
    parts: [
      {
        kind: 'watch',
        title: 'עשרות',
        steps: [
          { text: '30 × 4: כל נקודה היא עשר.', action: { kind: 'array', rows: 4, cols: 3, unit: 10 } },
          { text: '12 עשרות הן 120.', math: '30 × 4 = 120' }
        ]
      },
      { kind: 'try', title: 'כמה זה?', level: 1, key: '30x7' },
      {
        kind: 'watch',
        title: 'מפרקים',
        steps: [
          { text: '23 × 3: קודם 20 × 3 = 60, ואז 3 × 3 = 9.', action: { kind: 'array', rows: 3, cols: 3 } },
          { text: 'מחברים את החלקים: 60 ועוד 9.', action: { kind: 'column', a: 60, b: 9, op: '+' }, math: '23 × 3 = 69' }
        ]
      },
      { kind: 'try', title: 'עוד אחד', level: 2, key: '33x2' }
    ]
  },
  {
    skillId: 'story.muldiv',
    title: 'סיפורי כפל וחילוק',
    parts: [
      {
        kind: 'watch',
        title: 'קבוצות שוות',
        steps: [
          { text: 'יש 4 שקיות, ובכל שקית 3.', action: { kind: 'array', rows: 4, cols: 3 } },
          { text: 'קבוצות שוות – כופלים: 4 × 3.', math: '4 × 3 = 12' }
        ]
      },
      { kind: 'try', title: 'כמה בסך הכול?', level: 1, key: 'smul1:4x4' },
      {
        kind: 'watch',
        title: 'מחלקים שווה בשווה',
        steps: [
          { text: 'יש 12, ומחלקים ל-4 קבוצות.', action: { kind: 'share', total: 12, groups: 4, ask: 'each' } },
          { text: 'מחלקים שווה בשווה – זה חילוק.', math: '12 : 4 = 3' }
        ]
      },
      { kind: 'try', title: 'כמה בכל קבוצה?', level: 2, key: 'sdiv1:16:4' }
    ]
  },
  {
    skillId: 'col.add',
    title: 'חיבור במאונך',
    parts: [
      {
        kind: 'watch',
        title: 'טור אחרי טור',
        steps: [
          { text: 'כותבים אחד מתחת לשני: אחדות מתחת לאחדות.', action: { kind: 'column', a: 225, b: 322, op: '+' } },
          { text: 'מחברים כל טור, מימין לשמאל.', math: '225 + 322 = 547' }
        ]
      },
      { kind: 'try', title: 'כמה זה?', level: 1, key: 'col:202+281' },
      {
        kind: 'watch',
        title: 'עשר עובר הלאה',
        steps: [
          { text: '8 ועוד 5 זה 13: כותבים 3, והעשר עף לטור הבא.', action: { kind: 'column', a: 348, b: 275, op: '+' } },
          { text: 'כך בכל טור שיוצא בו 10 או יותר.', math: '348 + 275 = 623' }
        ]
      },
      { kind: 'try', title: 'עם המרה', level: 2, key: 'col:664+57' }
    ]
  },
  {
    skillId: 'col.sub',
    title: 'חיסור במאונך',
    parts: [
      {
        kind: 'watch',
        title: 'טור אחרי טור',
        steps: [
          { text: 'מחסרים כל טור, מימין לשמאל.', action: { kind: 'column', a: 769, b: 541, op: '-' } },
          { text: 'יוצא 228.', math: '769 − 541 = 228' }
        ]
      },
      { kind: 'try', title: 'כמה זה?', level: 1, key: 'col:982-352' },
      {
        kind: 'watch',
        title: 'פורטים',
        steps: [
          { text: 'אין מספיק אחדות: פורטים עשר מהטור שמשמאל.', action: { kind: 'column', a: 720, b: 297, op: '-' } },
          { text: 'ממשיכים כך בכל טור.', math: '720 − 297 = 423' }
        ]
      },
      { kind: 'try', title: 'עם פריטה', level: 2, key: 'col:931-299' }
    ]
  },
  {
    skillId: 'frac.part',
    title: 'מה זה שבר?',
    parts: [
      {
        kind: 'watch',
        title: 'חלקים שווים',
        steps: [
          { text: 'חותכים את הפיצה ל-4 חלקים שווים.', action: { kind: 'pizza', d: 4, n: 0 } },
          { text: 'צובעים חלק אחד: זה רבע.', action: { kind: 'pizza', d: 4, n: 1 }, math: '1/4' }
        ]
      },
      { kind: 'try', title: 'איזה חלק?', level: 1, key: 'fp:1/8' },
      {
        kind: 'watch',
        title: 'מונה ומכנה',
        steps: [
          { text: 'למטה – לכמה חלקים חתכנו. למעלה – כמה צבועים.', action: { kind: 'pizza', d: 8, n: 3 } },
          { text: 'שלוש שמיניות.', math: '3/8' }
        ]
      },
      { kind: 'try', title: 'ועכשיו?', level: 2, key: 'fp:3/8' }
    ]
  },
  {
    skillId: 'frac.compare',
    title: 'איזה שבר גדול יותר?',
    parts: [
      {
        kind: 'watch',
        title: 'אותו מכנה',
        steps: [
          { text: 'החלקים באותו גודל: יותר חלקים זה יותר.', action: { kind: 'pizza', d: 8, n: 5, vs: { n: 3, d: 8 } } },
          { text: 'חמש שמיניות גדול משלוש שמיניות.', math: '5/8 > 3/8' }
        ]
      },
      { kind: 'try', title: 'איזה סימן?', level: 1, key: 'fc:3/8?4/8' },
      {
        kind: 'watch',
        title: 'אותו מונה',
        steps: [
          { text: 'חותכים ל-8 או ל-4: כשחותכים ליותר חלקים, כל חלק קטן יותר.', action: { kind: 'pizza', d: 8, n: 1, vs: { n: 1, d: 4 } } },
          { text: 'שמינית קטנה מרבע.', math: '1/8 < 1/4' }
        ]
      },
      { kind: 'try', title: 'ועכשיו?', level: 2, key: 'fc:1/2?1/8' }
    ]
  },
  {
    skillId: 'frac.equiv',
    title: 'שברים שווים',
    parts: [
      {
        kind: 'watch',
        title: 'חותכים דק יותר',
        steps: [
          { text: 'חצי פיצה. חותכים כל חלק לשניים.', action: { kind: 'pizza', d: 2, n: 1, split: 2 } },
          { text: 'אותה כמות פיצה: חצי שווה לשני רבעים.', math: '1/2 = 2/4' }
        ]
      },
      { kind: 'try', title: 'איזה שבר שווה?', level: 1, key: 'fe:1/4=2/8' },
      {
        kind: 'watch',
        title: 'מצמצמים',
        steps: [
          { text: 'שש שמיניות: מדביקים כל שני חלקים.', action: { kind: 'pizza', d: 8, n: 6, join: 2 } },
          { text: 'יוצאים שלושה רבעים, באותו גודל.', math: '6/8 = 3/4' }
        ]
      },
      { kind: 'try', title: 'מצמצמים', level: 2, key: 'fs:3/6=1/2' }
    ]
  },
  {
    skillId: 'frac.add',
    title: 'חיבור שברים',
    parts: [
      {
        kind: 'watch',
        title: 'מאותה פיצה',
        steps: [
          { text: 'רבע ועוד שני רבעים, מאותה פיצה.', action: { kind: 'pizza', d: 4, n: 1, add: 2 } },
          { text: 'מחברים רק את החלקים: שלושה רבעים.', math: '1/4 + 2/4 = 3/4' }
        ]
      },
      { kind: 'try', title: 'כמה זה?', level: 1, key: 'fa:1/4+1/4' },
      {
        kind: 'watch',
        title: 'המכנה נשאר',
        steps: [
          { text: 'הפיצה לא נחתכת מחדש: היא נשארת בשמיניות.', action: { kind: 'pizza', d: 8, n: 3, add: 2 } },
          { text: 'שלוש שמיניות ועוד שתיים: חמש שמיניות.', math: '3/8 + 2/8 = 5/8' }
        ]
      },
      { kind: 'try', title: 'עוד אחד', level: 1, key: 'fa:3/8+2/8' }
    ]
  },
  {
    skillId: 'dec.read',
    title: 'מספרים עשרוניים',
    parts: [
      {
        kind: 'watch',
        title: 'עשיריות',
        steps: [
          { text: 'הריבוע הוא שלם. כל טור הוא עשירית.', action: { kind: 'decimal', a: 30 } },
          { text: 'שלוש עשיריות כותבים 0.3.', math: '0.3' }
        ]
      },
      { kind: 'try', title: 'איזה מספר?', level: 1, key: 'dr:70' },
      {
        kind: 'watch',
        title: 'מאיות',
        steps: [
          { text: 'כל משבצת היא מאית: 3 טורים ועוד 4 משבצות.', action: { kind: 'decimal', a: 34 } },
          { text: '34 מאיות כותבים 0.34.', math: '0.34' }
        ]
      },
      { kind: 'try', title: 'ועכשיו?', level: 2, key: 'dr:75' }
    ]
  },
  {
    skillId: 'dec.compare',
    title: 'משווים עשרוניים',
    parts: [
      {
        kind: 'watch',
        title: 'קודם עשיריות',
        steps: [
          { text: 'משווים טורים מלאים: 7 עשיריות ו-2 עשיריות.', action: { kind: 'decimal', a: 70, vs: 20 } },
          { text: '0.7 גדול מ-0.2.', math: '0.7 > 0.2' }
        ]
      },
      { kind: 'try', title: 'איזה סימן?', level: 1, key: 'dc:90?20' },
      {
        kind: 'watch',
        title: 'יותר ספרות?',
        steps: [
          { text: '0.25 ארוך יותר, אבל 0.3 צובע יותר.', action: { kind: 'decimal', a: 25, vs: 30 } },
          { text: 'משווים עשיריות לעשיריות.', math: '0.25 < 0.3' }
        ]
      },
      { kind: 'try', title: 'ועכשיו?', level: 2, key: 'dc:70?33' }
    ]
  },
  {
    skillId: 'dec.add',
    title: 'חיבור עשרוניים',
    parts: [
      {
        kind: 'watch',
        title: 'עשיריות',
        steps: [
          { text: '0.5 ועוד 0.7: מוסיפים טורים.', action: { kind: 'decimal', a: 50, b: 70 } },
          { text: 'עשר עשיריות הן שלם: יוצא 1.2.', math: '0.5 + 0.7 = 1.2' }
        ]
      },
      { kind: 'try', title: 'כמה זה?', level: 1, key: 'da:70+10' },
      {
        kind: 'watch',
        title: 'נקודה מתחת לנקודה',
        steps: [
          { text: '0.35 ועוד 0.4: עשיריות לעשיריות.', action: { kind: 'decimal', a: 35, b: 40 } },
          { text: 'יוצא 0.75.', math: '0.35 + 0.4 = 0.75' }
        ]
      },
      { kind: 'try', title: 'עוד אחד', level: 2, key: 'da:27+30' }
    ]
  },
  {
    skillId: 'geo.area',
    title: 'מה זה שטח?',
    parts: [
      {
        kind: 'watch',
        title: 'משבצות בפנים',
        steps: [
          { text: 'שטח זה כמה משבצות בתוך הצורה.', action: { kind: 'grid', w: 5, h: 3, ask: 'area' } },
          { text: '3 שורות של 5: שטח 15.', math: '5 × 3 = 15' }
        ]
      },
      { kind: 'try', title: 'מה השטח?', level: 1, key: 'area:5x3' },
      {
        kind: 'watch',
        title: 'צורה מורכבת',
        steps: [
          { text: 'לצורה הזאת חסרה פינה.', action: { kind: 'grid', w: 5, h: 4, cut: { w: 2, h: 1 }, ask: 'area' } },
          { text: 'מלבן שלם פחות הפינה: 20 פחות 2.', math: '20 − 2 = 18' }
        ]
      },
      { kind: 'try', title: 'לפי הצלעות', level: 2, key: 'area:8x4s' }
    ]
  },
  {
    skillId: 'geo.perimeter',
    title: 'מה זה היקף?',
    parts: [
      {
        kind: 'watch',
        title: 'הקו מסביב',
        steps: [
          { text: 'היקף זה אורך הקו מסביב.', action: { kind: 'grid', w: 5, h: 3, ask: 'perimeter' } },
          { text: '5 ועוד 3 ועוד 5 ועוד 3.', math: '5 + 3 + 5 + 3 = 16' }
        ]
      },
      { kind: 'try', title: 'מה ההיקף?', level: 1, key: 'per:5x2' },
      {
        kind: 'watch',
        title: 'שטח או היקף?',
        steps: [
          { text: 'שטח – המשבצות בפנים.', action: { kind: 'grid', w: 4, h: 2, ask: 'area' } },
          { text: 'היקף – הקו מסביב.', action: { kind: 'grid', w: 4, h: 2, ask: 'perimeter' }, math: '4 + 2 + 4 + 2 = 12' }
        ]
      },
      { kind: 'try', title: 'לפי הצלעות', level: 2, key: 'per:8x4s' }
    ]
  }
];

export function getLesson(skillId: string): Lesson | undefined {
  return LESSONS.find((l) => l.skillId === skillId);
}
