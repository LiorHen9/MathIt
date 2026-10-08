// The mastery engine (docs/ARCHITECTURE.md §7): pure functions, no UI, no storage, no clock.
// engine – mastery, spaced review, common mistakes; adaptive – the level inside a round;
// placement – the placement game; summary – recommendations and the parents' summary.
// Choosing questions (pick.ts) needs the generators and is imported by the game directly.
export * from './engine';
export * from './adaptive';
export * from './placement';
export * from './summary';
