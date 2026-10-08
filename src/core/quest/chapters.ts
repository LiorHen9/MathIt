// Chapters 2–5 (phase 7, grades 1–2): to 20 and crossing ten; to 100 and place value; sequences,
// money and the clock; adding and taking away to 100. Each one: lessons before every skill,
// practice at rising levels (some in the new games – a station names its game), a chest in the
// middle and the world's boss at the end, stronger every chapter. Ids are stable (saved progress
// uses them); chapter 1 (chapter1.ts) never changes.
// Stars: a chest wants about two thirds of the stars before it, a boss about three quarters.
import type { Chapter } from './types';

export const CHAPTER_2: Chapter = {
  id: 'c2',
  title: 'פרק 2: עד 20 ומעבר עשרת',
  sections: [
    {
      id: 'c2-to20',
      title: 'חיבור וחיסור עד 20',
      nodes: [
        { id: 'c2-add20-lesson', kind: 'lesson', title: 'שיעור: עשר ועוד', skillId: 'add.within20' },
        { id: 'c2-add20-1', kind: 'practice', title: 'חיבור עד 20', skillId: 'add.within20', level: 1 },
        { id: 'c2-add20-1j', kind: 'practice', title: 'קופצים עד 20', skillId: 'add.within20', level: 1, template: 'jump' },
        { id: 'c2-sub20-lesson', kind: 'lesson', title: 'שיעור: חיסור עד 20', skillId: 'sub.within20' },
        { id: 'c2-sub20-1', kind: 'practice', title: 'חיסור עד 20', skillId: 'sub.within20', level: 1 },
        { id: 'c2-chest', kind: 'chest', title: 'תיבת אוצר', needStars: 8, prize: { icon: '🎈', name: 'מדבקת בלון' } }
      ]
    },
    {
      id: 'c2-bridge',
      title: 'מעבר עשרת',
      nodes: [
        { id: 'c2-badd-lesson', kind: 'lesson', title: 'שיעור: משלימים ל-10', skillId: 'add.bridge10' },
        { id: 'c2-badd-1', kind: 'practice', title: 'מ-8 ומ-9', skillId: 'add.bridge10', level: 1 },
        { id: 'c2-badd-2', kind: 'practice', title: 'זוגות משלימים', skillId: 'add.bridge10', level: 2, template: 'match' },
        { id: 'c2-bsub-lesson', kind: 'lesson', title: 'שיעור: חיסור דרך ה-10', skillId: 'sub.bridge10' },
        { id: 'c2-bsub-1', kind: 'practice', title: 'חיסור דרך ה-10', skillId: 'sub.bridge10', level: 1 },
        { id: 'c2-bsub-2', kind: 'practice', title: 'קופצים דרך ה-10', skillId: 'sub.bridge10', level: 2, template: 'jump' },
        { id: 'c2-add20-2', kind: 'practice', title: 'חיבור עד 20: הכול', skillId: 'add.within20', level: 2, template: 'match' },
        { id: 'c2-sub20-2', kind: 'practice', title: 'חיסור עד 20: הכול', skillId: 'sub.within20', level: 2 },
        { id: 'c2-story-lesson', kind: 'lesson', title: 'שיעור: סיפורים עד 20', skillId: 'story.within20' },
        { id: 'c2-story-1', kind: 'practice', title: 'סיפורים עד 20', skillId: 'story.within20', level: 1 },
        {
          id: 'c2-boss',
          kind: 'boss',
          title: 'הבוס חוזר',
          needStars: 26,
          skillIds: ['add.bridge10', 'sub.bridge10', 'add.within20', 'sub.within20'],
          level: 2,
          hits: 8,
          bossId: 'muddler',
          tier: 2
        }
      ]
    }
  ]
};

export const CHAPTER_3: Chapter = {
  id: 'c3',
  title: 'פרק 3: עד 100 וערך המקום',
  sections: [
    {
      id: 'c3-numbers',
      title: 'מספרים עד 100',
      nodes: [
        { id: 'c3-n100-lesson', kind: 'lesson', title: 'שיעור: סופרים בעשרות', skillId: 'numbers.to100' },
        { id: 'c3-n100-1', kind: 'practice', title: 'עשרות שלמות', skillId: 'numbers.to100', level: 1 },
        { id: 'c3-n100-2', kind: 'practice', title: 'קופצים עד 50', skillId: 'numbers.to100', level: 2, template: 'jump' },
        { id: 'c3-n100-3', kind: 'practice', title: 'בונים עד 100', skillId: 'numbers.to100', level: 3, template: 'build' }
      ]
    },
    {
      id: 'c3-place',
      title: 'עשרות ואחדות',
      nodes: [
        { id: 'c3-pv-lesson', kind: 'lesson', title: 'שיעור: עשרות ואחדות', skillId: 'place.value' },
        { id: 'c3-pv-1', kind: 'practice', title: 'בונים מספרים', skillId: 'place.value', level: 1, template: 'build' },
        { id: 'c3-pv-2', kind: 'practice', title: 'כמה עשרות?', skillId: 'place.value', level: 2 },
        { id: 'c3-chest', kind: 'chest', title: 'תיבת אוצר', needStars: 12, prize: { icon: '🧮', name: 'מדבקת חשבונייה' } },
        { id: 'c3-pv-3', kind: 'practice', title: 'ערך הספרה', skillId: 'place.value', level: 3 },
        { id: 'c3-boss', kind: 'boss', title: 'הבוס חוזר', needStars: 15, skillIds: ['numbers.to100', 'place.value'], level: 3, hits: 8, bossId: 'muddler', tier: 3 }
      ]
    }
  ]
};

export const CHAPTER_4: Chapter = {
  id: 'c4',
  title: 'פרק 4: סדרות, כסף ושעון',
  sections: [
    {
      id: 'c4-pattern',
      title: 'סדרות',
      nodes: [
        { id: 'c4-pat-lesson', kind: 'lesson', title: 'שיעור: סדרות', skillId: 'pattern' },
        { id: 'c4-pat-1', kind: 'practice', title: 'קופצים בסדרה', skillId: 'pattern', level: 1, template: 'jump' },
        { id: 'c4-pat-2', kind: 'practice', title: 'גם אחורה', skillId: 'pattern', level: 2 }
      ]
    },
    {
      id: 'c4-money',
      title: 'כסף',
      nodes: [
        { id: 'c4-money-lesson', kind: 'lesson', title: 'שיעור: מטבעות', skillId: 'money' },
        { id: 'c4-money-1', kind: 'practice', title: 'סופרים מטבעות', skillId: 'money', level: 1, template: 'build' },
        { id: 'c4-money-2', kind: 'practice', title: 'קונים בחנות', skillId: 'money', level: 2, template: 'shop' },
        { id: 'c4-chest', kind: 'chest', title: 'תיבת אוצר', needStars: 10, prize: { icon: '👛', name: 'מדבקת ארנק' } },
        { id: 'c4-money-3', kind: 'practice', title: 'עודף', skillId: 'money', level: 3, template: 'shop' }
      ]
    },
    {
      id: 'c4-clock',
      title: 'שעון',
      nodes: [
        { id: 'c4-clock-lesson', kind: 'lesson', title: 'שיעור: השעון', skillId: 'clock' },
        { id: 'c4-clock-1', kind: 'practice', title: 'מזיזים מחוגים', skillId: 'clock', level: 1, template: 'clock' },
        { id: 'c4-clock-2', kind: 'practice', title: 'וחצי', skillId: 'clock', level: 2 },
        { id: 'c4-clock-3', kind: 'practice', title: 'ורבע', skillId: 'clock', level: 3, template: 'clock' },
        { id: 'c4-boss', kind: 'boss', title: 'הבוס חוזר', needStars: 20, skillIds: ['pattern', 'money', 'clock'], level: 2, hits: 9, bossId: 'muddler', tier: 4 }
      ]
    }
  ]
};

export const CHAPTER_5: Chapter = {
  id: 'c5',
  title: 'פרק 5: חיבור וחיסור עד 100',
  sections: [
    {
      id: 'c5-add',
      title: 'חיבור עד 100',
      nodes: [
        { id: 'c5-add-lesson', kind: 'lesson', title: 'שיעור: חיבור עד 100', skillId: 'add.within100' },
        { id: 'c5-add-1', kind: 'practice', title: 'עשרות שלמות', skillId: 'add.within100', level: 1, template: 'match' },
        { id: 'c5-add-2', kind: 'practice', title: 'בלי המרה', skillId: 'add.within100', level: 2, template: 'jump' }
      ]
    },
    {
      id: 'c5-sub',
      title: 'חיסור עד 100',
      nodes: [
        { id: 'c5-sub-lesson', kind: 'lesson', title: 'שיעור: חיסור עד 100', skillId: 'sub.within100' },
        { id: 'c5-sub-1', kind: 'practice', title: 'עשרות שלמות', skillId: 'sub.within100', level: 1 },
        { id: 'c5-sub-2', kind: 'practice', title: 'בלי פריטה', skillId: 'sub.within100', level: 2, template: 'match' },
        { id: 'c5-chest', kind: 'chest', title: 'תיבת אוצר', needStars: 10, prize: { icon: '🏆', name: 'מדבקת גביע' } },
        { id: 'c5-add-3', kind: 'practice', title: 'חיבור עם המרה', skillId: 'add.within100', level: 3 },
        { id: 'c5-sub-3', kind: 'practice', title: 'חיסור עם פריטה', skillId: 'sub.within100', level: 3, template: 'jump' },
        { id: 'c5-boss', kind: 'boss', title: 'הבוס הגדול', needStars: 16, skillIds: ['add.within100', 'sub.within100'], level: 3, hits: 10, bossId: 'muddler', tier: 5 }
      ]
    }
  ]
};
