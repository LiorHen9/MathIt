// Chapters 6–10 (phase 9, grades 3–6): times and division; adding and taking away in columns;
// fractions; decimals; area and perimeter. Each one: lessons before every skill, practice at
// rising levels (the new games – a pizza to colour, sequences, a race against a gentle clock),
// puzzle stations (a magic square, a balance, a missing number, a small KenKen), a chest in the
// middle and the world's boss at the end, stronger every chapter (tiers 6–10). Ids are stable
// (saved progress uses them); chapters 1–5 never change.
// Stars: a chest wants about two thirds of the stars before it, a boss about three quarters.
import type { Chapter } from './types';

export const CHAPTER_6: Chapter = {
  id: 'c6',
  title: 'פרק 6: כפל וחילוק',
  sections: [
    {
      id: 'c6-table',
      title: 'לוח הכפל',
      nodes: [
        { id: 'c6-mul-lesson', kind: 'lesson', title: 'שיעור: מה זה כפל', skillId: 'mul.table' },
        { id: 'c6-mul-1', kind: 'practice', title: 'כפול 2, 5, 10', skillId: 'mul.table', level: 1 },
        { id: 'c6-mul-1p', kind: 'practice', title: 'סדרות כפל', skillId: 'mul.table', level: 1, template: 'pattern' },
        { id: 'c6-mul-2', kind: 'practice', title: 'כפול 3 ו-4', skillId: 'mul.table', level: 2 },
        { id: 'c6-magic', kind: 'puzzle', title: 'ריבוע קסם', puzzle: 'magic', level: 1 },
        { id: 'c6-mul-3', kind: 'practice', title: 'כפול 6 עד 9', skillId: 'mul.table', level: 3 },
        { id: 'c6-chest', kind: 'chest', title: 'תיבת אוצר', needStars: 11, prize: { icon: '✖️', name: 'מדבקת כפל' } }
      ]
    },
    {
      id: 'c6-div',
      title: 'חילוק',
      nodes: [
        { id: 'c6-div-lesson', kind: 'lesson', title: 'שיעור: מה זה חילוק', skillId: 'div' },
        { id: 'c6-div-1', kind: 'practice', title: 'חלקי 2, 5, 10', skillId: 'div', level: 1 },
        { id: 'c6-mul-3s', kind: 'practice', title: 'מרוץ לוח הכפל', skillId: 'mul.table', level: 3, template: 'speed' },
        { id: 'c6-div-2', kind: 'practice', title: 'זוגות חילוק', skillId: 'div', level: 2, template: 'match' },
        { id: 'c6-missing', kind: 'puzzle', title: 'מספר חסר', puzzle: 'missing', level: 2 },
        { id: 'c6-div-3', kind: 'practice', title: 'חילוק עם שארית', skillId: 'div', level: 3 }
      ]
    },
    {
      id: 'c6-big',
      title: 'כפל גדול וסיפורים',
      nodes: [
        { id: 'c6-big-lesson', kind: 'lesson', title: 'שיעור: כפל גדול', skillId: 'mul.big' },
        { id: 'c6-big-2', kind: 'practice', title: 'כפל בלי המרה', skillId: 'mul.big', level: 2 },
        { id: 'c6-big-3', kind: 'practice', title: 'כפל עם המרה', skillId: 'mul.big', level: 3 },
        { id: 'c6-story-lesson', kind: 'lesson', title: 'שיעור: סיפורי כפל', skillId: 'story.muldiv' },
        { id: 'c6-story-1', kind: 'practice', title: 'סיפורי כפל וחילוק', skillId: 'story.muldiv', level: 2 },
        {
          id: 'c6-boss',
          kind: 'boss',
          title: 'הבוס חוזר',
          needStars: 32,
          skillIds: ['mul.table', 'div', 'mul.big'],
          level: 3,
          hits: 10,
          bossId: 'muddler',
          tier: 6
        }
      ]
    }
  ]
};

export const CHAPTER_7: Chapter = {
  id: 'c7',
  title: 'פרק 7: חשבון במאונך',
  sections: [
    {
      id: 'c7-add',
      title: 'חיבור במאונך',
      nodes: [
        { id: 'c7-add-lesson', kind: 'lesson', title: 'שיעור: חיבור במאונך', skillId: 'col.add' },
        { id: 'c7-add-1', kind: 'practice', title: 'חיבור בלי המרה', skillId: 'col.add', level: 1 },
        { id: 'c7-add-2', kind: 'practice', title: 'חיבור עם המרה', skillId: 'col.add', level: 2 },
        { id: 'c7-balance', kind: 'puzzle', title: 'מאזניים', puzzle: 'balance', level: 1 },
        { id: 'c7-chest', kind: 'chest', title: 'תיבת אוצר', needStars: 7, prize: { icon: '🧾', name: 'מדבקת מאונך' } }
      ]
    },
    {
      id: 'c7-sub',
      title: 'חיסור במאונך',
      nodes: [
        { id: 'c7-sub-lesson', kind: 'lesson', title: 'שיעור: חיסור במאונך', skillId: 'col.sub' },
        { id: 'c7-sub-1', kind: 'practice', title: 'חיסור בלי פריטה', skillId: 'col.sub', level: 1 },
        { id: 'c7-sub-2', kind: 'practice', title: 'חיסור עם פריטה', skillId: 'col.sub', level: 2 },
        { id: 'c7-add-3', kind: 'practice', title: 'חיבור עד 10,000', skillId: 'col.add', level: 3 },
        { id: 'c7-sub-3', kind: 'practice', title: 'חיסור עד 10,000', skillId: 'col.sub', level: 3 },
        { id: 'c7-kenken', kind: 'puzzle', title: 'קנקן', puzzle: 'kenken', level: 1 },
        { id: 'c7-boss', kind: 'boss', title: 'הבוס חוזר', needStars: 20, skillIds: ['col.add', 'col.sub'], level: 3, hits: 10, bossId: 'muddler', tier: 7 }
      ]
    }
  ]
};

export const CHAPTER_8: Chapter = {
  id: 'c8',
  title: 'פרק 8: שברים',
  sections: [
    {
      id: 'c8-part',
      title: 'חלק משלם',
      nodes: [
        { id: 'c8-part-lesson', kind: 'lesson', title: 'שיעור: מה זה שבר', skillId: 'frac.part' },
        { id: 'c8-part-1', kind: 'practice', title: 'איזה חלק צבוע', skillId: 'frac.part', level: 1 },
        { id: 'c8-part-1s', kind: 'practice', title: 'צובעים פיצה', skillId: 'frac.part', level: 1, template: 'slice' },
        { id: 'c8-part-2', kind: 'practice', title: 'כמה חלקים', skillId: 'frac.part', level: 2, template: 'slice' },
        { id: 'c8-cmp-lesson', kind: 'lesson', title: 'שיעור: משווים שברים', skillId: 'frac.compare' },
        { id: 'c8-cmp-1', kind: 'practice', title: 'אותו מכנה', skillId: 'frac.compare', level: 1 },
        { id: 'c8-cmp-2', kind: 'practice', title: 'אותו מונה', skillId: 'frac.compare', level: 2 },
        { id: 'c8-chest', kind: 'chest', title: 'תיבת אוצר', needStars: 12, prize: { icon: '🍕', name: 'מדבקת פיצה' } }
      ]
    },
    {
      id: 'c8-equiv',
      title: 'שברים שווים וחיבור',
      nodes: [
        { id: 'c8-eq-lesson', kind: 'lesson', title: 'שיעור: שברים שווים', skillId: 'frac.equiv' },
        { id: 'c8-eq-1', kind: 'practice', title: 'חותכים דק יותר', skillId: 'frac.equiv', level: 1 },
        { id: 'c8-eq-2', kind: 'practice', title: 'מצמצמים', skillId: 'frac.equiv', level: 2 },
        { id: 'c8-add-lesson', kind: 'lesson', title: 'שיעור: חיבור שברים', skillId: 'frac.add' },
        { id: 'c8-add-1', kind: 'practice', title: 'מחברים חלקים', skillId: 'frac.add', level: 1, template: 'slice' },
        { id: 'c8-add-2', kind: 'practice', title: 'עד פיצה שלמה', skillId: 'frac.add', level: 2 },
        { id: 'c8-magic', kind: 'puzzle', title: 'ריבוע קסם גדול', puzzle: 'magic', level: 2 },
        { id: 'c8-boss', kind: 'boss', title: 'הבוס חוזר', needStars: 26, skillIds: ['frac.compare', 'frac.equiv', 'frac.add'], level: 2, hits: 11, bossId: 'muddler', tier: 8 }
      ]
    }
  ]
};

export const CHAPTER_9: Chapter = {
  id: 'c9',
  title: 'פרק 9: מספרים עשרוניים',
  sections: [
    {
      id: 'c9-read',
      title: 'עשיריות ומאיות',
      nodes: [
        { id: 'c9-read-lesson', kind: 'lesson', title: 'שיעור: עשרוניים', skillId: 'dec.read' },
        { id: 'c9-read-1', kind: 'practice', title: 'עשיריות', skillId: 'dec.read', level: 1 },
        { id: 'c9-read-2', kind: 'practice', title: 'מאיות', skillId: 'dec.read', level: 2 },
        { id: 'c9-cmp-lesson', kind: 'lesson', title: 'שיעור: משווים עשרוניים', skillId: 'dec.compare' },
        { id: 'c9-cmp-1', kind: 'practice', title: 'משווים עשיריות', skillId: 'dec.compare', level: 1 },
        { id: 'c9-chest', kind: 'chest', title: 'תיבת אוצר', needStars: 8, prize: { icon: '💧', name: 'מדבקת טיפה' } }
      ]
    },
    {
      id: 'c9-add',
      title: 'משווים ומחברים',
      nodes: [
        { id: 'c9-cmp-2', kind: 'practice', title: 'יותר ספרות?', skillId: 'dec.compare', level: 2 },
        { id: 'c9-add-lesson', kind: 'lesson', title: 'שיעור: חיבור עשרוניים', skillId: 'dec.add' },
        { id: 'c9-add-1', kind: 'practice', title: 'מחברים עשיריות', skillId: 'dec.add', level: 1 },
        { id: 'c9-add-2', kind: 'practice', title: 'מחברים מאיות', skillId: 'dec.add', level: 2 },
        { id: 'c9-balance', kind: 'puzzle', title: 'מאזניים כפולים', puzzle: 'balance', level: 2 },
        { id: 'c9-boss', kind: 'boss', title: 'הבוס חוזר', needStars: 18, skillIds: ['dec.compare', 'dec.add'], level: 2, hits: 11, bossId: 'muddler', tier: 9 }
      ]
    }
  ]
};

export const CHAPTER_10: Chapter = {
  id: 'c10',
  title: 'פרק 10: שטח והיקף',
  sections: [
    {
      id: 'c10-area',
      title: 'שטח',
      nodes: [
        { id: 'c10-area-lesson', kind: 'lesson', title: 'שיעור: מה זה שטח', skillId: 'geo.area' },
        { id: 'c10-area-1', kind: 'practice', title: 'סופרים משבצות', skillId: 'geo.area', level: 1 },
        { id: 'c10-area-2', kind: 'practice', title: 'שטח לפי הצלעות', skillId: 'geo.area', level: 2 },
        { id: 'c10-missing', kind: 'puzzle', title: 'מספר חסר', puzzle: 'missing', level: 1 },
        { id: 'c10-chest', kind: 'chest', title: 'תיבת אוצר', needStars: 7, prize: { icon: '📐', name: 'מדבקת סרגל' } }
      ]
    },
    {
      id: 'c10-per',
      title: 'היקף',
      nodes: [
        { id: 'c10-per-lesson', kind: 'lesson', title: 'שיעור: מה זה היקף', skillId: 'geo.perimeter' },
        { id: 'c10-per-1', kind: 'practice', title: 'סופרים צלעות', skillId: 'geo.perimeter', level: 1 },
        { id: 'c10-per-2', kind: 'practice', title: 'היקף לפי הצלעות', skillId: 'geo.perimeter', level: 2 },
        { id: 'c10-area-3', kind: 'practice', title: 'שטח של צורה', skillId: 'geo.area', level: 3 },
        { id: 'c10-per-3', kind: 'practice', title: 'היקף של צורה', skillId: 'geo.perimeter', level: 3 },
        { id: 'c10-missing-3', kind: 'puzzle', title: 'מספר חסר כפול', puzzle: 'missing', level: 3 },
        { id: 'c10-kenken', kind: 'puzzle', title: 'קנקן גדול', puzzle: 'kenken', level: 2 },
        { id: 'c10-boss', kind: 'boss', title: 'הבוס הגדול', needStars: 22, skillIds: ['geo.area', 'geo.perimeter'], level: 3, hits: 12, bossId: 'muddler', tier: 10 }
      ]
    }
  ]
};
