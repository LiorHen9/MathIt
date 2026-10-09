// geo.area / geo.perimeter (phase 9): a rectangle on a grid (level 1, counted), a rectangle by its
// sides (level 2, the side lengths written on it), and a simple compound shape – a rectangle with
// a corner cut off, an L (level 3).
// Smart wrong answers: 'area-perimeter' (the one for the other), 'half-perimeter' (two sides once:
// 5 × 3 → 8), 'times-as-plus' (the sides added for the area), 'table-neighbor' (a row too many or
// too few), 'one-part' (the corner forgotten).
// The explanation fills the squares row by row (the area), or stretches the line around the shape
// side by side (the perimeter). Cutting a corner off an L keeps the perimeter of the whole
// rectangle: two sides move in – worth seeing.
import { gridMeasures, type Action, type ErrorTag, type Generator, type Hint, type Visual } from '../types';
import { numberDistractors } from './common';

type Q = ReturnType<Generator>;
type Lv = Parameters<Generator>[0];
type R = Parameters<Generator>[1];

interface Shape {
  w: number;
  h: number;
  cut?: { w: number; h: number };
  sides: boolean;
}

function shapeFor(level: Lv, rng: R): Shape {
  if (level.level === 1) return { w: rng.int(2, 6), h: rng.int(2, 5), sides: false };
  if (level.level === 2) return { w: rng.int(3, 10), h: rng.int(2, 8), sides: true };
  const w = rng.int(3, 7);
  const h = rng.int(3, 6);
  return { w, h, cut: { w: rng.int(1, w - 2), h: rng.int(1, h - 2) }, sides: false };
}

const visualOf = (s: Shape): Visual => ({ kind: 'grid', w: s.w, h: s.h, ...(s.cut ? { cut: s.cut } : {}), ...(s.sides ? { sides: true } : {}) });

export function areaQuestion(s: Shape, level: Lv, rng: R): Q {
  const { area, perimeter } = gridMeasures(s.w, s.h, s.cut);
  const smart: [number, ErrorTag][] = [[perimeter, 'area-perimeter']];
  if (s.cut) smart.push([s.w * s.h, 'one-part']);
  smart.push([s.w + s.h, 'times-as-plus'], [area + s.w, 'table-neighbor'], [area - s.w, 'table-neighbor'], [area + 1, 'count-off-by-one'], [area - 1, 'count-off-by-one']);
  const { distractors, errorTags } = numberDistractors(area, smart, level, rng);
  const fill: Action = { kind: 'grid', w: s.w, h: s.h, ...(s.cut ? { cut: s.cut } : {}), ask: 'area' };
  const hints: Hint[] = [
    { text: s.cut ? 'סופרים את המשבצות שבתוך הצורה, שורה אחרי שורה.' : `${s.h} שורות, ובכל שורה ${s.w} משבצות.`, action: fill },
    { for: ['area-perimeter'], text: 'שטח זה כמה משבצות בפנים; היקף זה הקו מסביב.', action: fill },
    { for: ['times-as-plus'], text: `השטח הוא ${s.w} × ${s.h}, לא ${s.w} + ${s.h}.`, action: fill },
    { for: ['table-neighbor', 'count-off-by-one', 'near'], text: 'סופרים שוב את השורות, כל שורה פעם אחת.', action: fill }
  ];
  if (s.cut) hints.push({ for: ['one-part'], text: `הפינה החסרה לא נספרת: ${s.cut.w * s.cut.h} משבצות פחות.`, action: fill });
  return {
    prompt: { text: s.cut ? 'מה השטח של הצורה?' : 'מה השטח של המלבן?', visual: visualOf(s), speech: s.cut ? 'מה השטח של הצורה? כמה משבצות יש בה?' : 'מה השטח של המלבן?' },
    answer: area,
    distractors,
    errorTags,
    hints,
    explanation: [
      { text: `ממלאים שורה אחרי שורה: ${s.w} בכל שורה.`, action: fill },
      { text: s.cut ? `${s.w} × ${s.h} פחות הפינה: ${area} משבצות.` : `${s.h} שורות של ${s.w}: ${area} משבצות.`, math: s.cut ? `${s.w * s.h} − ${s.cut.w * s.cut.h} = ${area}` : `${s.w} × ${s.h} = ${area}` }
    ],
    numeric: true,
    key: `area:${s.w}x${s.h}${s.cut ? `-${s.cut.w}x${s.cut.h}` : ''}${s.sides ? 's' : ''}`
  };
}

export function perimeterQuestion(s: Shape, level: Lv, rng: R): Q {
  const { area, perimeter } = gridMeasures(s.w, s.h, s.cut);
  const smart: [number, ErrorTag][] = [[s.w + s.h, 'half-perimeter'], [area, 'area-perimeter']];
  if (s.cut) smart.push([perimeter - s.cut.w - s.cut.h, 'one-part']);
  smart.push([perimeter + 2, 'near'], [perimeter - 2, 'near'], [perimeter + 1, 'count-off-by-one'], [perimeter - 1, 'count-off-by-one']);
  const { distractors, errorTags } = numberDistractors(perimeter, smart, level, rng);
  const trace: Action = { kind: 'grid', w: s.w, h: s.h, ...(s.cut ? { cut: s.cut } : {}), ask: 'perimeter' };
  const hints: Hint[] = [
    { text: 'הולכים על הקו מסביב וסופרים כל צלע.', action: trace },
    { for: ['half-perimeter'], text: `למלבן ארבע צלעות: ${s.w} + ${s.h} + ${s.w} + ${s.h}.`, action: trace },
    { for: ['area-perimeter'], text: 'היקף זה הקו מסביב; שטח זה המשבצות בפנים.', action: trace },
    { for: ['near', 'count-off-by-one'], text: 'סופרים שוב את הקו, כל צלע פעם אחת.', action: trace }
  ];
  if (s.cut) hints.push({ for: ['one-part'], text: 'גם הצלעות של הפינה החתוכה הן חלק מהקו.', action: trace });
  return {
    prompt: { text: s.cut ? 'מה ההיקף של הצורה?' : 'מה ההיקף של המלבן?', visual: visualOf(s), speech: s.cut ? 'מה ההיקף של הצורה?' : 'מה ההיקף של המלבן?' },
    answer: perimeter,
    distractors,
    errorTags,
    hints,
    explanation: [
      { text: 'מותחים קו מסביב, צלע אחרי צלע.', action: trace },
      {
        text: s.cut ? 'הפינה החתוכה הזיזה שתי צלעות פנימה, אבל הקו באותו אורך.' : `${s.w} + ${s.h} + ${s.w} + ${s.h} = ${perimeter}.`,
        math: `${s.w} + ${s.h} + ${s.w} + ${s.h} = ${perimeter}`
      }
    ],
    numeric: true,
    key: `per:${s.w}x${s.h}${s.cut ? `-${s.cut.w}x${s.cut.h}` : ''}${s.sides ? 's' : ''}`
  };
}

export const area: Generator = (level, rng) => areaQuestion(shapeFor(level, rng), level, rng);
export const perimeter: Generator = (level, rng) => perimeterQuestion(shapeFor(level, rng), level, rng);
