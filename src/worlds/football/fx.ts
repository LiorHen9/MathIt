// ⚽ Football's feedback on top of the shared mapping: grass flies off the kick and the ball
// flies to the dot; three in a row and the crowd shouts "גול!"; hits on the keeper too.
import type { WorldFx } from '../../fx/director';

export const fx: WorldFx = {
  correct: (e, b) => ({ particles: { kind: 'leaf', count: b.particles?.count ?? 20, at: 'el' }, fly: '⚽', word: e.streak >= 3 ? 'גול!' : undefined }),
  unlock: (_e, b) => ({ particles: { kind: 'confetti', count: b.particles?.count ?? 40, at: 'el' } }),
  levelUp: (_e, b) => ({ particles: { kind: 'confetti', count: b.particles?.count ?? 30, at: 'el' } }),
  chestOpen: () => ({ particles: { kind: 'confetti', count: 50, at: 'el' } }),
  bossHit: (e) => ({ particles: { kind: 'leaf', count: 16 + e.n * 2, at: 'el' }, word: e.left === 0 ? 'גול!' : undefined }),
  coin: () => ({ fly: '🪙' })
};
