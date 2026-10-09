// A shape on squared paper (phase 9): a rectangle, or an L – a rectangle with its top right
// corner cut off. Its squares and the sides around it, positioned in squares of `cell` px.
// Shared by the question's picture and the teaching animation (manipulatives/GridAnim.tsx).
import './phase9.css';

export interface Side {
  /** In squares, left to right / top to bottom on screen. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** The sides of the shape, clockwise from the top left (a cut corner is the top right). */
export function shapeSides(w: number, h: number, cut?: { w: number; h: number }): Side[] {
  if (!cut)
    return [
      { x0: 0, y0: 0, x1: w, y1: 0 },
      { x0: w, y0: 0, x1: w, y1: h },
      { x0: w, y0: h, x1: 0, y1: h },
      { x0: 0, y0: h, x1: 0, y1: 0 }
    ];
  const a = w - cut.w;
  return [
    { x0: 0, y0: 0, x1: a, y1: 0 },
    { x0: a, y0: 0, x1: a, y1: cut.h },
    { x0: a, y0: cut.h, x1: w, y1: cut.h },
    { x0: w, y0: cut.h, x1: w, y1: h },
    { x0: w, y0: h, x1: 0, y1: h },
    { x0: 0, y0: h, x1: 0, y1: 0 }
  ];
}

/** Is square (column x, row y) inside the shape? */
export const inShape = (x: number, y: number, w: number, cut?: { w: number; h: number }) => !cut || !(y < cut.h && x >= w - cut.w);

/** The shape on squared paper: its squares and its outline (shared with the static picture). */
export function GridShape({ w, h, cut, cell, sides = false, squares = true, hideFill = true, hideLine = false }: { w: number; h: number; cut?: { w: number; h: number }; cell: number; sides?: boolean; squares?: boolean; hideFill?: boolean; hideLine?: boolean }) {
  const list = shapeSides(w, h, cut);
  return (
    <span class={`gr-shape ${squares ? '' : 'is-plain'}`} style={`--gr-c:${cell}px; width:${w * cell}px; height:${h * cell}px`}>
      {Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) =>
          inShape(x, y, w, cut) ? <span key={`${x}-${y}`} class={`gr-sq ${hideFill ? 'm-hide' : ''}`} data-row={y} style={`left:${x * cell}px; top:${y * cell}px`} /> : null
        )
      )}
      {list.map((s, i) => {
        const horiz = s.y0 === s.y1;
        const len = Math.abs(horiz ? s.x1 - s.x0 : s.y1 - s.y0);
        const left = Math.min(s.x0, s.x1) * cell;
        const top = Math.min(s.y0, s.y1) * cell;
        // Each side grows from where the walk around starts it.
        const origin = horiz ? (s.x1 > s.x0 ? 'left' : 'right') : s.y1 > s.y0 ? 'top' : 'bottom';
        return (
          <span key={i} class={`gr-side ${horiz ? 'is-h' : 'is-v'} ${hideLine ? 'm-hide' : ''}`} data-len={len} style={`left:${left}px; top:${top}px; ${horiz ? `width:${len * cell}px` : `height:${len * cell}px`}; transform-origin:${origin}`}>
            {(sides || hideLine) && <span class={`gr-len ${hideLine ? 'm-hide' : ''}`}>{len}</span>}
          </span>
        );
      })}
    </span>
  );
}

