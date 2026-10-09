// 🏀 Basketball's feedback on top of the shared mapping: sparks off the rim and the ball flies to
// the dot; a streak sets the ball on fire ("סוויש!"); the last hit on the champion is a "סל!".
import type { WorldFx } from '../../fx/director';

export const fx: WorldFx = {
  correct: (e, b) => ({
    particles: { kind: e.streak >= 3 ? 'flame' : 'spark', count: b.particles?.count ?? 20, at: 'el' },
    fly: '🏀',
    word: e.streak >= 3 ? 'סוויש!' : undefined
  }),
  unlock: (_e, b) => ({ particles: { kind: 'flame', count: b.particles?.count ?? 40, at: 'el' } }),
  levelUp: (_e, b) => ({ particles: { kind: 'flame', count: b.particles?.count ?? 30, at: 'el' } }),
  goalReached: (_e, b) => ({ particles: { kind: 'flame', count: b.particles?.count ?? 40, at: 'el' } }),
  bossHit: (e) => ({ particles: { kind: e.n >= 4 ? 'flame' : 'spark', count: 16 + e.n * 2, at: 'el' }, word: e.left === 0 ? 'סל!' : undefined }),
  coin: () => ({ fly: '🏅' }),
  puzzleSolved: (_e, b) => ({ particles: { kind: 'spark', count: b.particles?.count ?? 80, at: 'screen' }, word: 'סל של חידה!' }),
};
