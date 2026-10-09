// 🧱 Blocks' feedback on top of the shared mapping: little blocks fly off and a block flies to the
// dot; on a streak a gem is picked up ("בלינג!"); the pickaxe chips the cave creature.
import type { WorldFx } from '../../fx/director';

export const fx: WorldFx = {
  correct: (e, b) => ({
    particles: { kind: 'block', count: b.particles?.count ?? 20, at: 'el' },
    fly: e.streak >= 3 ? '💎' : '🧱',
    word: e.streak >= 3 ? 'בלינג!' : undefined
  }),
  unlock: (_e, b) => ({ particles: { kind: 'block', count: b.particles?.count ?? 40, at: 'el' } }),
  levelUp: (_e, b) => ({ particles: { kind: 'block', count: b.particles?.count ?? 30, at: 'el' } }),
  goalReached: (_e, b) => ({ particles: { kind: 'block', count: b.particles?.count ?? 40, at: 'el' } }),
  chestOpen: () => ({ particles: { kind: 'block', count: 44, at: 'el' } }),
  bossHit: (e) => ({ particles: { kind: 'block', count: 16 + e.n * 2, at: 'el' }, word: e.left === 0 ? 'קראק!' : undefined }),
  coin: () => ({ fly: '💠' }),
  puzzleSolved: (_e, b) => ({ particles: { kind: 'block', count: b.particles?.count ?? 80, at: 'screen' }, word: 'נבנה!' }),
  achievement: (_e, b) => ({ particles: { kind: 'block', count: b.particles?.count ?? 36, at: 'el' }, word: 'נבנה הישג!' }),
  chapterDone: (_e, b) => ({ particles: { kind: 'block', count: b.particles?.count ?? 120, at: 'screen' }, word: 'הפרק נבנה!' }),
  journeyDone: (_e, b) => ({ particles: { kind: 'block', count: b.particles?.count ?? 180, at: 'screen' }, word: 'הטירה הושלמה!' })
};
