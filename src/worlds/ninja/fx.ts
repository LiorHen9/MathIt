// 🥷 Ninja's feedback on top of the shared mapping: sparks where the star hits the target; a
// streak ends in a puff of smoke and "הי-יא!"; the shadow master's hits too.
import type { WorldFx } from '../../fx/director';

export const fx: WorldFx = {
  correct: (e, b) => ({
    particles: { kind: e.streak >= 3 ? 'smoke' : 'spark', count: b.particles?.count ?? 20, at: 'el' },
    fly: '💫',
    word: e.streak >= 3 ? 'הי-יא!' : undefined
  }),
  unlock: (_e, b) => ({ particles: { kind: 'spark', count: b.particles?.count ?? 40, at: 'el' } }),
  levelUp: (_e, b) => ({ particles: { kind: 'spark', count: b.particles?.count ?? 30, at: 'el' } }),
  goalReached: (_e, b) => ({ particles: { kind: 'spark', count: b.particles?.count ?? 40, at: 'el' } }),
  chestOpen: () => ({ particles: { kind: 'smoke', count: 30, at: 'el' } }),
  bossHit: (e) => ({ particles: { kind: e.left === 0 ? 'smoke' : 'spark', count: 16 + e.n * 2, at: 'el' }, word: e.left === 0 ? 'הי-יא!' : undefined }),
  coin: () => ({ fly: '🍙' }),
  puzzleSolved: (_e, b) => ({ particles: { kind: 'smoke', count: b.particles?.count ?? 80, at: 'screen' }, word: 'החידה נפרצה!' }),
  achievement: (_e, b) => ({ particles: { kind: 'spark', count: b.particles?.count ?? 36, at: 'el' }, word: 'חגורה חדשה!' }),
  chapterDone: (_e, b) => ({ particles: { kind: 'spark', count: b.particles?.count ?? 120, at: 'screen' }, word: 'הדוג׳ו מריע!' }),
  journeyDone: (_e, b) => ({ particles: { kind: 'spark', count: b.particles?.count ?? 180, at: 'screen' }, word: 'מאסטר המסע!' })
};
