// Pieces shared by the manipulatives: the counted star, a number under it, the result badge.
// Colours come from the world's variables only (--num-*, --brand, --ink…), via styles.css.
import type { ComponentChildren } from 'preact';
import { starPath } from '../fx/Hero';

const STAR = starPath(12, 12.5, 11, 5, 0.48);

/** One counted thing. `group` picks its colour (1 = first group, 2 = second). */
export function Star({ group = 1, label, cls = '' }: { group?: 1 | 2; label?: string | number; cls?: string }) {
  return (
    <span class={`m-item g-${group} ${cls}`}>
      <svg class="m-star" viewBox="0 0 24 24" aria-hidden="true">
        <path d={STAR} />
      </svg>
      {label !== undefined && <span class="m-n">{label}</span>}
    </span>
  );
}

/** The value the animation ends on, shown big at the end. */
export function Total({ children }: { children: ComponentChildren }) {
  return (
    <span class="m-total" dir="ltr">
      {children}
    </span>
  );
}

/** The frame every manipulative sits in: LTR (numbers and the line read left to right). */
export function Frame({ kind, label, children, rootRef }: { kind: string; label: string; children: ComponentChildren; rootRef: { current: HTMLDivElement | null } }) {
  return (
    <div class={`manip m-${kind}`} ref={rootRef} role="img" aria-label={label} dir="ltr" data-kind={kind}>
      {children}
    </div>
  );
}

export const q = <T extends Element = HTMLElement>(root: Element, sel: string) => [...root.querySelectorAll<T>(sel)];
