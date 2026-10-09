// Achievements (phase 10), pure: what a child has achieved, computed from what the app already keeps
// – results per skill, the way on the map, practice by day, coins and collectibles – plus the one
// thing nothing else remembers, the best run of first-try right answers (storage/achievements.ts).
// No UI, no worlds, no clock of its own. The ids are stable (they are saved in the `achievements`
// store when a celebration has been shown); the words come in three forms (boy, girl, other) and the
// screens pick one with byGender. Nothing is ever achieved from empty data (tests/core/check.ts).
import { JOURNEY, chapterMaxStars, chapterNodes, chapterStars, type QuestProgress } from '../quest/index';
import { MASTERED } from '../mastery/engine';
import type { SkillId } from '../types';

/** The same sentence for a boy, a girl, and when the gender is not set. */
export interface Gendered {
  m: string;
  f: string;
  x: string;
}

import type { AchievementId } from './ids';
export { ACHIEVEMENT_IDS, nextStreak, type AchievementId } from './ids';

/** What the app keeps that achievements are made of (one profile). */
export interface AchievementInput {
  /** Results per skill (storage/skillStates.ts). */
  skills: Partial<Record<SkillId | string, { attempts: number; mastery: number; lessonSeen: boolean; recentResults?: boolean[] }>>;
  /** The way on the map (storage/questProgress.ts). */
  quest: QuestProgress & { reviews?: number };
  /** Practice by day: the local date and how many questions (storage/sessions.ts). */
  days: { day: string; questions: number; right: number }[];
  /** Coins in every world together, and collectibles won (storage/inventory.ts). */
  coins: number;
  items: number;
  /** The best run of first-try right answers ever (storage/achievements.ts). */
  bestStreak: number;
}

export interface Achievement {
  id: AchievementId;
  icon: string;
  /** A short name: "10 ברצף". */
  title: Gendered;
  /** What it is for, in one sentence (read aloud when it opens). */
  text: Gendered;
  /** Is it achieved? Pure. */
  test: (d: AchievementInput) => boolean;
  /** How far along (shown under a locked one): done of target. */
  progress?: (d: AchievementInput) => { done: number; target: number };
}

const same = (s: string): Gendered => ({ m: s, f: s, x: s });
const g = (m: string, f: string, x: string): Gendered => ({ m, f, x });

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const answers = (d: AchievementInput) => sum(Object.values(d.skills).map((s) => s?.attempts ?? 0));
const nodesOf = (kind: string) => JOURNEY.chapters.flatMap(chapterNodes).filter((n) => n.kind === kind);
const done = (d: AchievementInput, id: string) => (d.quest.stars[id] ?? 0) >= 1;
const bossesBeaten = (d: AchievementInput) => nodesOf('boss').filter((n) => done(d, n.id)).length;
const LAST_BOSS = nodesOf('boss').at(-1)!.id;

/** Days in a row with practice, ending on the latest day practised. */
export function longestDayRun(days: { day: string; questions: number }[]): number {
  const set = [...new Set(days.filter((x) => x.questions > 0).map((x) => x.day))].sort();
  let best = 0;
  let run = 0;
  let prev = 0;
  for (const day of set) {
    const [y, m, dd] = day.split('-').map(Number);
    // Noon, so a daylight-saving change never makes a day 23 or 25 hours.
    const t = Date.UTC(y, m - 1, dd, 12);
    run = prev && Math.round((t - prev) / 86_400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

/** Every achievement, in the order the screen shows them (easy first). Ids are stable: never rename. */
export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-right',
    icon: '🌱',
    title: same('צעד ראשון'),
    text: g('ענית נכון בפעם הראשונה!', 'ענית נכון בפעם הראשונה!', 'עניתם נכון בפעם הראשונה!'),
    test: (d) => sum(d.days.map((x) => x.right)) > 0 || d.bestStreak > 0 || Object.values(d.skills).some((s) => s?.recentResults?.includes(true))
  },
  {
    id: 'first-lesson',
    icon: '📖',
    title: same('תלמיד חכם'),
    text: g('ראית שיעור עד הסוף.', 'ראית שיעור עד הסוף.', 'ראיתם שיעור עד הסוף.'),
    test: (d) => Object.values(d.skills).some((s) => s?.lessonSeen)
  },
  {
    id: 'streak-10',
    icon: '🔥',
    title: same('10 ברצף'),
    text: g('ענית נכון 10 פעמים ברצף, בלי טעות!', 'ענית נכון 10 פעמים ברצף, בלי טעות!', 'עניתם נכון 10 פעמים ברצף, בלי טעות!'),
    test: (d) => d.bestStreak >= 10,
    progress: (d) => ({ done: Math.min(10, d.bestStreak), target: 10 })
  },
  {
    id: 'streak-25',
    icon: '☄️',
    title: same('25 ברצף'),
    text: g('25 תשובות נכונות ברצף – אלוף!', '25 תשובות נכונות ברצף – אלופה!', '25 תשובות נכונות ברצף – אלופים!'),
    test: (d) => d.bestStreak >= 25,
    progress: (d) => ({ done: Math.min(25, d.bestStreak), target: 25 })
  },
  {
    id: 'three-stars',
    icon: '🌟',
    title: same('שלושה כוכבים'),
    text: g('קיבלת 3 כוכבים בתחנה.', 'קיבלת 3 כוכבים בתחנה.', 'קיבלתם 3 כוכבים בתחנה.'),
    test: (d) => Object.values(d.quest.stars).some((s) => s >= 3)
  },
  {
    id: 'first-chest',
    icon: '🎁',
    title: same('תיבת אוצר'),
    text: g('פתחת את התיבה הראשונה.', 'פתחת את התיבה הראשונה.', 'פתחתם את התיבה הראשונה.'),
    test: (d) => Object.keys(d.quest.chests).length > 0
  },
  {
    id: 'first-boss',
    icon: '⚔️',
    title: same('בוס ראשון'),
    text: g('ניצחת את הבוס הראשון!', 'ניצחת את הבוס הראשון!', 'ניצחתם את הבוס הראשון!'),
    test: (d) => bossesBeaten(d) >= 1
  },
  {
    id: 'first-puzzle',
    icon: '🧩',
    title: same('פותר חידות'),
    text: g('פתרת חידה ראשונה.', 'פתרת חידה ראשונה.', 'פתרתם חידה ראשונה.'),
    test: (d) => nodesOf('puzzle').some((n) => done(d, n.id))
  },
  {
    id: 'answers-100',
    icon: '💯',
    title: same('100 תשובות'),
    text: g('ענית על 100 שאלות.', 'ענית על 100 שאלות.', 'עניתם על 100 שאלות.'),
    test: (d) => answers(d) >= 100,
    progress: (d) => ({ done: Math.min(100, answers(d)), target: 100 })
  },
  {
    id: 'answers-1000',
    icon: '🏔️',
    title: same('1,000 תשובות'),
    text: g('אלף שאלות – איזה מתמטיקאי!', 'אלף שאלות – איזו מתמטיקאית!', 'אלף שאלות – איזה כוח!'),
    test: (d) => answers(d) >= 1000,
    progress: (d) => ({ done: Math.min(1000, answers(d)), target: 1000 })
  },
  {
    id: 'days-3',
    icon: '📅',
    title: same('3 ימים ברצף'),
    text: g('תרגלת שלושה ימים ברצף.', 'תרגלת שלושה ימים ברצף.', 'תרגלתם שלושה ימים ברצף.'),
    test: (d) => longestDayRun(d.days) >= 3,
    progress: (d) => ({ done: Math.min(3, longestDayRun(d.days)), target: 3 })
  },
  {
    id: 'week',
    icon: '🗓️',
    title: same('שבוע של תרגול'),
    text: g('תרגלת שבעה ימים ברצף!', 'תרגלת שבעה ימים ברצף!', 'תרגלתם שבעה ימים ברצף!'),
    test: (d) => longestDayRun(d.days) >= 7,
    progress: (d) => ({ done: Math.min(7, longestDayRun(d.days)), target: 7 })
  },
  {
    id: 'chapter-puzzles',
    icon: '🗝️',
    title: same('כל החידות בפרק'),
    text: g('פתרת את כל החידות של פרק.', 'פתרת את כל החידות של פרק.', 'פתרתם את כל החידות של פרק.'),
    test: (d) =>
      JOURNEY.chapters.some((c) => {
        const puzzles = chapterNodes(c).filter((n) => n.kind === 'puzzle');
        return puzzles.length > 0 && puzzles.every((n) => done(d, n.id));
      })
  },
  {
    id: 'chapter-perfect',
    icon: '👑',
    title: same('פרק מושלם'),
    text: g('כל הכוכבים בפרק שלם!', 'כל הכוכבים בפרק שלם!', 'כל הכוכבים בפרק שלם!'),
    test: (d) => JOURNEY.chapters.some((c) => chapterStars(c, d.quest) === chapterMaxStars(c))
  },
  {
    id: 'bosses-5',
    icon: '🛡️',
    title: same('חמישה בוסים'),
    text: g('ניצחת חמישה בוסים.', 'ניצחת חמישה בוסים.', 'ניצחתם חמישה בוסים.'),
    test: (d) => bossesBeaten(d) >= 5,
    progress: (d) => ({ done: Math.min(5, bossesBeaten(d)), target: 5 })
  },
  {
    id: 'table-master',
    icon: '✖️',
    title: same('לוח הכפל נשלט'),
    text: g('אתה יודע את לוח הכפל!', 'את יודעת את לוח הכפל!', 'אתם יודעים את לוח הכפל!'),
    test: (d) => (d.skills['mul.table']?.mastery ?? 0) >= MASTERED
  },
  {
    id: 'coins-100',
    icon: '💰',
    title: same('100 מטבעות'),
    text: g('אספת 100 מטבעות.', 'אספת 100 מטבעות.', 'אספתם 100 מטבעות.'),
    test: (d) => d.coins >= 100,
    progress: (d) => ({ done: Math.min(100, d.coins), target: 100 })
  },
  {
    id: 'collector',
    icon: '🎒',
    title: g('אספן', 'אספנית', 'אספנים'),
    text: g('יש לך שישה פריטים באוסף.', 'יש לך שישה פריטים באוסף.', 'יש לכם שישה פריטים באוסף.'),
    test: (d) => d.items >= 6,
    progress: (d) => ({ done: Math.min(6, d.items), target: 6 })
  },
  {
    id: 'reviews-5',
    icon: '🔁',
    title: same('חוזרים וזוכרים'),
    text: g('עשית חמש חזרות.', 'עשית חמש חזרות.', 'עשיתם חמש חזרות.'),
    test: (d) => (d.quest.reviews ?? 0) >= 5,
    progress: (d) => ({ done: Math.min(5, d.quest.reviews ?? 0), target: 5 })
  },
  {
    id: 'journey-end',
    icon: '🏆',
    title: same('סוף המסע'),
    text: g('ניצחת את הבוס האחרון וסיימת את המסע!', 'ניצחת את הבוס האחרון וסיימת את המסע!', 'ניצחתם את הבוס האחרון וסיימתם את המסע!'),
    test: (d) => done(d, LAST_BOSS)
  }
];

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** The ids achieved now, in display order. Pure. */
export function achieved(d: AchievementInput): AchievementId[] {
  return ACHIEVEMENTS.filter((a) => a.test(d)).map((a) => a.id);
}

/** Achieved now and not celebrated yet (`seen`: the ids already shown). */
export function newlyAchieved(d: AchievementInput, seen: readonly string[]): AchievementId[] {
  return achieved(d).filter((id) => !seen.includes(id));
}

/** The form for a profile's gender (core stays free of profiles/; same rule as byGender). */
export function forGender(t: Gendered, gender: 'boy' | 'girl' | 'other' | undefined): string {
  return gender === 'boy' ? t.m : gender === 'girl' ? t.f : t.x;
}

/** Empty data: what a brand-new profile has (tests: nothing is achieved from it). */
export function emptyInput(): AchievementInput {
  return { skills: {}, quest: { stars: {}, chests: {}, reviews: 0 }, days: [], coins: 0, items: 0, bestStreak: 0 };
}
