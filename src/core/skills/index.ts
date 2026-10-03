// The skill graph, as data (docs/ARCHITECTURE.md §4.1). Phase 2: the four skills of "numbers and
// adding up to 10". Every level keeps all numbers (question and choices) inside [min, max].
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
    levels: [
      { level: 1, label: 'עד 5', min: 0, max: 5 },
      { level: 2, label: 'עד 7', min: 0, max: 7 },
      { level: 3, label: 'עד 10', min: 0, max: 10 }
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
