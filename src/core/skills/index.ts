// The skill graph, as data (docs/ARCHITECTURE.md §4.1). Phase 2: the four skills of "numbers and
// adding up to 10"; phase 5 word problems; phase 7 grades 1–2 (to 20, crossing ten, to 100, place
// value, sequences, money, the clock) and the game templates each skill is played in. Every level keeps all numbers (question and choices) inside [min, max].
// Small enough for the home screen to import; the generators themselves load with the game.
import type { AgeBand, Skill, SkillId } from '../types';
import { AGE_BANDS } from '../types';

export const SKILLS: readonly Skill[] = [
  {
    id: 'count.to10',
    title: 'סופרים עד 10',
    icon: '⭐',
    band: '4-5',
    prerequisites: [],
    generatorId: 'count',
    templates: ['pop'],
    levels: [
      { level: 1, label: 'עד 5', min: 1, max: 5 },
      { level: 2, label: 'עד 7', min: 1, max: 7 },
      { level: 3, label: 'עד 10', min: 1, max: 10 }
    ]
  },
  {
    id: 'compare.to10',
    title: 'גדול, קטן או שווה',
    icon: '⚖️',
    band: '4-5',
    prerequisites: ['count.to10'],
    generatorId: 'compare',
    templates: ['pop'],
    levels: [
      { level: 1, label: 'עד 5', min: 0, max: 5 },
      { level: 2, label: 'עד 10', min: 0, max: 10 }
    ]
  },
  {
    id: 'add.within10',
    title: 'חיבור עד 10',
    icon: '➕',
    band: '6-7',
    prerequisites: ['count.to10'],
    generatorId: 'add',
    templates: ['pop', 'jump'],
    levels: [
      { level: 1, label: 'עד 5', min: 0, max: 5 },
      { level: 2, label: 'עד 7', min: 0, max: 7 },
      { level: 3, label: 'עד 10', min: 0, max: 10 }
    ]
  },
  {
    id: 'sub.within10',
    title: 'חיסור עד 10',
    icon: '➖',
    band: '6-7',
    prerequisites: ['add.within10'],
    generatorId: 'sub',
    templates: ['pop', 'jump'],
    levels: [
      { level: 1, label: 'עד 5', min: 0, max: 5 },
      { level: 2, label: 'עד 7', min: 0, max: 7 },
      { level: 3, label: 'עד 10', min: 0, max: 10 }
    ]
  },
  {
    // Word problems: adding and taking away as a little story in the world's words (core/story.ts).
    id: 'story.within10',
    title: 'סיפורי חשבון',
    icon: '💬',
    band: '6-7',
    prerequisites: ['add.within10', 'sub.within10'],
    generatorId: 'story',
    templates: ['pop'],
    levels: [
      { level: 1, label: 'עד 5', min: 0, max: 5 },
      { level: 2, label: 'עד 10', min: 0, max: 10 }
    ]
  },
  // Phase 7 – grades 1–2 (chapters 2–5 of the journey).
  {
    id: 'add.within20',
    title: 'חיבור עד 20',
    icon: '🔟',
    band: '6-7',
    prerequisites: ['add.within10'],
    generatorId: 'add20',
    templates: ['pop', 'jump', 'match'],
    levels: [
      { level: 1, label: 'בלי מעבר עשרת', min: 0, max: 20 },
      { level: 2, label: 'עד 20', min: 0, max: 20 }
    ]
  },
  {
    id: 'sub.within20',
    title: 'חיסור עד 20',
    icon: '🔻',
    band: '6-7',
    prerequisites: ['sub.within10', 'add.within20'],
    generatorId: 'sub20',
    templates: ['pop', 'jump', 'match'],
    levels: [
      { level: 1, label: 'בלי מעבר עשרת', min: 0, max: 20 },
      { level: 2, label: 'עד 20', min: 0, max: 20 }
    ]
  },
  {
    id: 'add.bridge10',
    title: 'משלימים ל-10',
    icon: '🌉',
    band: '6-7',
    prerequisites: ['add.within20'],
    generatorId: 'bridgeAdd',
    templates: ['pop', 'jump', 'match'],
    levels: [
      { level: 1, label: 'מ-8 ומ-9', min: 0, max: 20 },
      { level: 2, label: 'מכל מספר', min: 0, max: 20 }
    ]
  },
  {
    id: 'sub.bridge10',
    title: 'חיסור דרך ה-10',
    icon: '🪜',
    band: '6-7',
    prerequisites: ['sub.within20', 'add.bridge10'],
    generatorId: 'bridgeSub',
    templates: ['pop', 'jump', 'match'],
    levels: [
      { level: 1, label: 'מ-11 עד 14', min: 0, max: 20 },
      { level: 2, label: 'עד 18', min: 0, max: 20 }
    ]
  },
  {
    id: 'story.within20',
    title: 'סיפורים עד 20',
    icon: '📜',
    band: '6-7',
    prerequisites: ['add.bridge10', 'sub.bridge10'],
    generatorId: 'story20',
    templates: ['pop'],
    levels: [
      { level: 1, label: 'בלי מעבר עשרת', min: 0, max: 20 },
      { level: 2, label: 'עם מעבר עשרת', min: 0, max: 20 }
    ]
  },
  {
    id: 'numbers.to100',
    title: 'מספרים עד 100',
    icon: '💯',
    band: '6-7',
    prerequisites: ['count.to10', 'add.within20'],
    generatorId: 'numbers100',
    templates: ['pop', 'jump', 'build'],
    levels: [
      { level: 1, label: 'עשרות שלמות', min: 0, max: 100 },
      { level: 2, label: 'עד 50', min: 0, max: 50 },
      { level: 3, label: 'עד 100', min: 0, max: 100 }
    ]
  },
  {
    id: 'place.value',
    title: 'עשרות ואחדות',
    icon: '🧮',
    band: '6-7',
    prerequisites: ['numbers.to100'],
    generatorId: 'place',
    templates: ['pop', 'build'],
    levels: [
      { level: 1, label: 'בונים מספר', min: 0, max: 50 },
      { level: 2, label: 'כמה עשרות?', min: 0, max: 99 },
      { level: 3, label: 'ערך הספרה', min: 0, max: 99 }
    ]
  },
  {
    id: 'pattern',
    title: 'סדרות',
    icon: '🔢',
    band: '6-7',
    prerequisites: ['numbers.to100'],
    generatorId: 'pattern',
    templates: ['pop', 'jump'],
    levels: [
      { level: 1, label: 'קדימה', min: 0, max: 50 },
      { level: 2, label: 'גם אחורה', min: 0, max: 50 },
      { level: 3, label: 'עד 100', min: 0, max: 100 }
    ]
  },
  {
    id: 'money',
    title: 'כסף',
    icon: '🪙',
    band: '6-7',
    prerequisites: ['add.within20', 'numbers.to100'],
    generatorId: 'money',
    templates: ['pop', 'build', 'shop'],
    levels: [
      { level: 1, label: 'עד 10 ₪', min: 0, max: 10 },
      { level: 2, label: 'עד 30 ₪', min: 0, max: 30 },
      { level: 3, label: 'עודף ואגורות', min: 0, max: 20 }
    ]
  },
  {
    id: 'clock',
    title: 'השעון',
    icon: '🕒',
    band: '6-7',
    prerequisites: ['numbers.to100'],
    generatorId: 'clock',
    templates: ['pop', 'clock'],
    levels: [
      { level: 1, label: 'שעה עגולה', min: 0, max: 12 },
      { level: 2, label: 'וחצי', min: 0, max: 12 },
      { level: 3, label: 'ורבע', min: 0, max: 12 }
    ]
  },
  {
    id: 'add.within100',
    title: 'חיבור עד 100',
    icon: '➕',
    band: '8-9',
    prerequisites: ['place.value', 'add.bridge10'],
    generatorId: 'add100',
    templates: ['pop', 'jump', 'match'],
    levels: [
      { level: 1, label: 'עשרות שלמות', min: 0, max: 100 },
      { level: 2, label: 'בלי המרה', min: 0, max: 99 },
      { level: 3, label: 'עם המרה', min: 0, max: 100 }
    ]
  },
  {
    id: 'sub.within100',
    title: 'חיסור עד 100',
    icon: '➖',
    band: '8-9',
    prerequisites: ['add.within100', 'sub.bridge10'],
    generatorId: 'sub100',
    templates: ['pop', 'jump', 'match'],
    levels: [
      { level: 1, label: 'עשרות שלמות', min: 0, max: 100 },
      { level: 2, label: 'בלי פריטה', min: 0, max: 99 },
      { level: 3, label: 'עם פריטה', min: 0, max: 100 }
    ]
  }
];

export function getSkill(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

export function isSkillId(id: string): id is SkillId {
  return SKILLS.some((s) => s.id === id);
}

/**
 * Skills to suggest for an age band: those of the band itself; for older children, the skills of
 * the highest band below theirs (until their own band has skills).
 */
export function recommendedSkills(band: AgeBand): SkillId[] {
  const at = AGE_BANDS.indexOf(band);
  for (let i = at; i >= 0; i--) {
    const here = SKILLS.filter((s) => s.band === AGE_BANDS[i]);
    if (here.length) return here.map((s) => s.id);
  }
  return SKILLS.filter((s) => s.band === AGE_BANDS[0]).map((s) => s.id);
}

/**
 * Where to start before the child has played a skill (the mastery engine replaces this in phase 6):
 * a skill below the child's band starts at its top level, otherwise at level 1.
 */
export function startLevel(skill: Skill, band: AgeBand): number {
  return AGE_BANDS.indexOf(band) > AGE_BANDS.indexOf(skill.band) ? skill.levels.length : 1;
}
