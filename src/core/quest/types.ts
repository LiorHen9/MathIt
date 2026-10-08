// The quest map as data (docs/ARCHITECTURE.md §4.4): Journey → Chapter → Section → Node.
// Learning Core: no UI, no worlds, no sounds. The map screen (screens/QuestMap.tsx) draws it.
import type { SkillId } from '../types';

export type NodeKind = 'lesson' | 'practice' | 'chest' | 'boss' | 'review';

interface NodeBase {
  /** Stable: saved progress is keyed by it. Never rename a shipped id. */
  id: string;
  kind: NodeKind;
  /** Short, under the station on the map: "סופרים עד 5". */
  title: string;
  /**
   * Besides the station before it being done: this many stars in the chapter (a chest, the boss).
   * The map says how many are still missing.
   */
  needStars?: number;
}

/** A lesson (core/lessons/) – done when watched to the end, one star. */
export interface LessonNode extends NodeBase {
  kind: 'lesson';
  skillId: SkillId;
}

/** A practice round of one skill at a fixed level – 0–3 stars, done from one star. */
export interface PracticeNode extends NodeBase {
  kind: 'practice';
  skillId: SkillId;
  /** The level the round plays (the skill's levels; rising along the chapter). */
  level: number;
}

/** A treasure chest – no stars, done once opened. */
export interface ChestNode extends NodeBase {
  kind: 'chest';
  /** The symbolic prize that flies out (phase 5 brings coins and a collection). */
  prize: { icon: string; name: string };
}

/** The boss at the end of a chapter: questions from several skills, one hit per right answer. */
export interface BossNode extends NodeBase {
  kind: 'boss';
  skillIds: SkillId[];
  level: number;
  /** Right answers needed to win (= the boss's power bar). */
  hits: number;
  /** Which boss (one shared boss until phase 5). */
  bossId: 'muddler';
}

/**
 * A review station (phase 6, docs/ARCHITECTURE.md §7.2): made on the fly when skills are due for
 * review – never part of a chapter, never saved as a station (its id is not a chapter's), the
 * quest record only remembers when one was done. A short mixed round, 0–3 stars.
 */
export interface ReviewNode extends NodeBase {
  kind: 'review';
  skillIds: SkillId[];
  /** Questions in the review. */
  count: number;
}

export type QuestNode = LessonNode | PracticeNode | ChestNode | BossNode | ReviewNode;

export interface Section {
  id: string;
  /** A banner on the map: "מספרים עד 10". */
  title: string;
  nodes: QuestNode[];
}

export interface Chapter {
  id: string;
  title: string;
  sections: Section[];
}

export interface Journey {
  id: string;
  chapters: Chapter[];
}

/** A profile's progress on the map (what storage/questProgress.ts keeps, minus bookkeeping). */
export interface QuestProgress {
  /** Best stars per node id (a lesson: 1). */
  stars: Record<string, number>;
  /** Opened chests: node id → the prize icon. */
  chests: Record<string, string>;
}

export type NodeStatus = 'locked' | 'open' | 'done';
