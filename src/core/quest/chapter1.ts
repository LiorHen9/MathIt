// Chapter 1: numbers up to 10, then adding and taking away up to 10 – sixteen stations from the
// first lesson to the boss. Ids are stable (saved progress uses them).
// Stars on the way: lessons 1 each, practice up to 3. The chest wants 10 in the chapter (at least
// one round with 2 stars before it); the boss wants 18 (a few rounds replayed for more stars).
import type { Chapter } from './types';

export const CHAPTER_1: Chapter = {
  id: 'c1',
  title: 'פרק 1: עד 10',
  sections: [
    {
      id: 'c1-numbers',
      title: 'מספרים עד 10',
      nodes: [
        { id: 'c1-count-lesson', kind: 'lesson', title: 'שיעור: סופרים', skillId: 'count.to10' },
        { id: 'c1-count-5', kind: 'practice', title: 'סופרים עד 5', skillId: 'count.to10', level: 1 },
        { id: 'c1-count-10', kind: 'practice', title: 'סופרים עד 10', skillId: 'count.to10', level: 3 },
        { id: 'c1-compare-lesson', kind: 'lesson', title: 'שיעור: גדול או קטן', skillId: 'compare.to10' },
        { id: 'c1-compare-5', kind: 'practice', title: 'משווים עד 5', skillId: 'compare.to10', level: 1 },
        { id: 'c1-compare-10', kind: 'practice', title: 'משווים עד 10', skillId: 'compare.to10', level: 2 }
      ]
    },
    {
      id: 'c1-addsub',
      title: 'חיבור וחיסור עד 10',
      nodes: [
        { id: 'c1-add-lesson', kind: 'lesson', title: 'שיעור: מחברים', skillId: 'add.within10' },
        { id: 'c1-add-5', kind: 'practice', title: 'חיבור עד 5', skillId: 'add.within10', level: 1 },
        { id: 'c1-add-7', kind: 'practice', title: 'חיבור עד 7', skillId: 'add.within10', level: 2 },
        { id: 'c1-chest', kind: 'chest', title: 'תיבת אוצר', needStars: 10, prize: { icon: '🌈', name: 'מדבקת קשת' } },
        { id: 'c1-sub-lesson', kind: 'lesson', title: 'שיעור: מחסרים', skillId: 'sub.within10' },
        { id: 'c1-sub-5', kind: 'practice', title: 'חיסור עד 5', skillId: 'sub.within10', level: 1 },
        { id: 'c1-sub-7', kind: 'practice', title: 'חיסור עד 7', skillId: 'sub.within10', level: 2 },
        { id: 'c1-add-10', kind: 'practice', title: 'חיבור עד 10', skillId: 'add.within10', level: 3 },
        { id: 'c1-sub-10', kind: 'practice', title: 'חיסור עד 10', skillId: 'sub.within10', level: 3 },
        { id: 'c1-boss', kind: 'boss', title: 'הבלבלן', needStars: 18, skillIds: ['add.within10', 'sub.within10'], level: 3, hits: 8, bossId: 'muddler', tier: 1 }
      ]
    }
  ]
};
