// Achievements per profile (store `achievements`, schema 6, key = profile id; phase 10).
// What a child achieved is computed (core/achievements) from the other stores; this record only
// keeps what they cannot tell: which achievements were already celebrated (and when), the running
// streak of first-try right answers and the best one ever, and when the record started counting.
//
// `since` = 0 until the first check: a profile that played before achievements existed (or came
// from an older backup) gets everything it has already earned marked as shown, quietly – the map
// does the first check when it opens – so nothing old bursts open; from then on each new one is
// celebrated once. Checks run one at a time per profile, so two quick checks never both celebrate
// the same one. (Deleting a profile deletes its record: profiles.ts.)
import { achieved, newlyAchieved, type AchievementId, type AchievementInput } from '../core/achievements/index';
import { now as clockNow } from '../app/clock';
import { changeAchievements as change, getAchievementRecord, type AchievementRecord } from './achievementRecord';
import { listSkillStates } from './skillStates';
import { getQuestRecord } from './questProgress';
import { listInventories } from './inventory';
import { listDayLogs } from './sessions';

/** Everything achievements are made of, for one profile (and its record). */
export async function achievementInput(profileId: string, rec?: AchievementRecord): Promise<AchievementInput> {
  const [skills, quest, invs, days, r] = await Promise.all([listSkillStates(profileId), getQuestRecord(profileId), listInventories(profileId), listDayLogs(profileId), rec ?? getAchievementRecord(profileId)]);
  return {
    skills,
    quest,
    days,
    coins: invs.reduce((s, i) => s + i.coins, 0),
    items: invs.reduce((s, i) => s + i.items.length, 0),
    bestStreak: r.bestStreak
  };
}

/**
 * Look for new achievements. Returns the ones to celebrate now (each only once, ever); they are
 * saved as shown before this returns. The very first check marks what was already earned as shown
 * and celebrates nothing.
 */
export function checkAchievements(profileId: string, now = clockNow()): Promise<AchievementId[]> {
  return change(profileId, async (r) => {
    const input = await achievementInput(profileId, r);
    if (!r.since) {
      const unlocked = { ...r.unlocked };
      for (const id of achieved(input)) unlocked[id] ??= now;
      return { next: { ...r, unlocked, since: now }, out: [] };
    }
    const fresh = newlyAchieved(input, Object.keys(r.unlocked));
    if (!fresh.length) return { next: null, out: [] };
    const unlocked = { ...r.unlocked };
    for (const id of fresh) unlocked[id] = now;
    return { next: { ...r, unlocked }, out: fresh };
  });
}
