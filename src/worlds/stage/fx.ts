// 🎤 Stage's feedback on top of the shared mapping: music notes float up and a note flies to the
// dot; a streak swings the spotlights on ("הופעה!"); every hit chases a puff of shadow away.
import type { WorldFx } from '../../fx/director';

export const fx: WorldFx = {
  correct: (e, b) => ({
    particles: { kind: e.streak >= 3 ? 'spark' : 'note', count: b.particles?.count ?? 20, at: 'el' },
    fly: '🎵',
    word: e.streak >= 3 ? 'הופעה!' : undefined
  }),
  unlock: (_e, b) => ({ particles: { kind: 'note', count: b.particles?.count ?? 40, at: 'el' } }),
  levelUp: (_e, b) => ({ particles: { kind: 'note', count: b.particles?.count ?? 30, at: 'el' } }),
  goalReached: (_e, b) => ({ particles: { kind: 'note', count: b.particles?.count ?? 40, at: 'el' } }),
  chestOpen: () => ({ particles: { kind: 'note', count: 40, at: 'el' } }),
  bossHit: (e) => ({ particles: { kind: 'smoke', count: 12 + e.n * 2, at: 'el' }, word: e.left === 0 ? 'הצל נעלם!' : undefined }),
  coin: () => ({ fly: '🎟️' }),
  puzzleSolved: (_e, b) => ({ particles: { kind: 'note', count: b.particles?.count ?? 80, at: 'screen' }, word: 'הדרן!' }),
};
