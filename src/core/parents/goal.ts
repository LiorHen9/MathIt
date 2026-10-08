// The daily goal and the break reminder (phase 8), pure. A parent sets a goal per child – a number
// of questions or of minutes a day – and, if they like, a gentle break offered after N minutes of
// play. The map shows the goal as a meter and celebrates it once a day (the `goalReached` event).
import type { DayLog } from './days';

export interface DailyGoal {
  kind: 'questions' | 'minutes';
  amount: number;
}

export const GOAL_CHOICES: Record<DailyGoal['kind'], number[]> = {
  questions: [10, 20, 30, 50],
  minutes: [5, 10, 15, 20, 30]
};

/** Break reminder choices, in minutes. */
export const BREAK_CHOICES = [10, 15, 20, 30, 45];

/** A stored goal, or null when it is missing or broken. */
export function normalizeGoal(raw: unknown): DailyGoal | null {
  if (!raw || typeof raw !== 'object') return null;
  const { kind, amount } = raw as Partial<DailyGoal>;
  if (kind !== 'questions' && kind !== 'minutes') return null;
  return Number.isInteger(amount) && amount! >= 1 && amount! <= (kind === 'questions' ? 500 : 240) ? { kind, amount: amount! } : null;
}

export interface GoalProgress {
  done: number;
  target: number;
  /** 0..1 */
  ratio: number;
  reached: boolean;
}

/** How far today's practice is toward the goal. */
export function goalProgress(goal: DailyGoal, today: Pick<DayLog, 'ms' | 'questions'>): GoalProgress {
  const done = goal.kind === 'questions' ? today.questions : Math.floor(today.ms / 60_000);
  return { done, target: goal.amount, ratio: Math.min(1, done / goal.amount), reached: done >= goal.amount };
}

/** "20 שאלות", "10 דקות" */
export function goalText(g: DailyGoal): string {
  return g.kind === 'questions' ? `${g.amount} שאלות` : `${g.amount} דקות`;
}

/**
 * Is it time to offer a break? After `afterMin` minutes since play began, or since the last
 * offer (so it comes back gently, not on every screen).
 */
export function breakDue(afterMin: number | null, startedAt: number, lastOffer: number, now: number): boolean {
  if (!afterMin || !startedAt) return false;
  return now - Math.max(startedAt, lastOffer) >= afterMin * 60_000;
}
