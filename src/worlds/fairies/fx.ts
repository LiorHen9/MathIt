// 🧚 Fairies' feedback on top of the shared mapping: sparkles and a ✨ for a right answer, a
// rainbow trail and "קסם!" on a streak, rainbows when something opens, the witch's fog on a hit.
import type { WorldFx } from '../../fx/director';

export const fx: WorldFx = {
  correct: (e, b) => ({
    particles: { kind: e.streak >= 3 ? 'rainbow' : 'sparkle', count: b.particles?.count ?? 20, at: 'el' },
    fly: '✨',
    word: e.streak >= 3 ? 'קסם!' : undefined
  }),
  unlock: (_e, b) => ({ particles: { kind: 'rainbow', count: b.particles?.count ?? 40, at: 'el' } }),
  levelUp: (_e, b) => ({ particles: { kind: 'rainbow', count: b.particles?.count ?? 30, at: 'el' } }),
  chestOpen: (_e, b) => ({ particles: { kind: 'rainbow', count: b.particles?.count ?? 40, at: 'el' } }),
  bossHit: (e) => ({ particles: { kind: 'smoke', count: 10 + e.n, at: 'el' }, word: e.left === 0 ? 'פוף!' : undefined }),
  coin: () => ({ fly: '💎' })
};
