// Drawings shared by the question pictures (ui/Picture.tsx), the teaching animations
// (manipulatives/) and the game templates (games/): tens rods and ones cubes, coins, a clock face.
// Original SVG / CSS, colours from the world's CSS variables only (--num-*, --coin-*, --ink…).
import type { Ref } from 'preact';
import { moneyText } from '../core/types';

/** A tens rod: ten cubes stuck together. */
export function Rod({ cls = '' }: { cls?: string }) {
  return (
    <span class={`blk-rod ${cls}`} aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} class="blk-cell" />
      ))}
    </span>
  );
}

/** A ones cube. */
export function Cube({ cls = '' }: { cls?: string }) {
  return <span class={`blk-cube ${cls}`} aria-hidden="true" />;
}

/** Twelve corners: the 5 shekel coin's edge. */
const DODECAGON = Array.from({ length: 12 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 12 + Math.PI / 12;
  return `${(50 + 47 * Math.cos(a)).toFixed(1)},${(50 + 47 * Math.sin(a)).toFixed(1)}`;
}).join(' ');

/** How big a coin is drawn, by value (a 10 ₪ is the biggest). */
export const COIN_SIZE: Record<string, number> = { '10': 58, '5': 54, '2': 50, '1': 44, '0.5': 46 };

/** A coin, by value in shekels: 10 (two metals), 5 (twelve corners), 2, 1 (silver), ½ (gold). */
export function Coin({ value, cls = '' }: { value: number; cls?: string }) {
  const gold = value === 0.5;
  const label = value === 0.5 ? '50' : String(value);
  const unit = value === 0.5 ? 'אג׳' : '₪';
  return (
    <svg class={`coin coin-${String(value).replace('.', '_')} ${cls}`} viewBox="0 0 100 100" aria-hidden="true" style={`--coin:${COIN_SIZE[String(value)] ?? 48}px`}>
      {value === 5 ? (
        <polygon points={DODECAGON} class="coin-silver" />
      ) : (
        <circle cx="50" cy="50" r="47" class={gold ? 'coin-gold' : 'coin-silver'} />
      )}
      {value === 10 && <circle cx="50" cy="50" r="33" class="coin-gold" />}
      <circle cx="50" cy="50" r={value === 10 ? 33 : 40} class="coin-rim" />
      <text x="50" y="52" class="coin-num">
        {label}
      </text>
      <text x="50" y="76" class="coin-unit">
        {unit}
      </text>
    </svg>
  );
}

export const coinName = (v: number) => (v === 0.5 ? '50 אגורות' : v === 1 ? 'שקל' : `${v} שקלים`);

/** Hand angles (degrees from 12, clockwise) for a time. */
export function handAngles(h: number, m: number): { hour: number; minute: number } {
  return { hour: ((h % 12) + m / 60) * 30, minute: m * 6 };
}

/**
 * An analog clock face. The hands are groups turned by CSS transform (around the centre), so the
 * clock manipulative and template can animate them; `refs` gives them to the caller.
 */
export function ClockFace({
  h,
  m,
  cls = '',
  hourRef,
  minuteRef,
  label
}: {
  h: number;
  m: number;
  cls?: string;
  hourRef?: Ref<SVGGElement>;
  minuteRef?: Ref<SVGGElement>;
  label?: string;
}) {
  const a = handAngles(h, m);
  return (
    <svg class={`clock-face ${cls}`} viewBox="0 0 100 100" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
      <circle cx="50" cy="50" r="47" class="clock-rim" />
      <circle cx="50" cy="50" r="43" class="clock-dial" />
      {Array.from({ length: 60 }, (_, i) => {
        const big = i % 5 === 0;
        const r1 = big ? 36 : 39;
        const ang = (i * 6 * Math.PI) / 180;
        return (
          <line
            key={i}
            class={big ? 'clock-tick is-big' : 'clock-tick'}
            x1={(50 + r1 * Math.sin(ang)).toFixed(2)}
            y1={(50 - r1 * Math.cos(ang)).toFixed(2)}
            x2={(50 + 41 * Math.sin(ang)).toFixed(2)}
            y2={(50 - 41 * Math.cos(ang)).toFixed(2)}
          />
        );
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const ang = (n * 30 * Math.PI) / 180;
        return (
          <text key={n} class="clock-num" x={(50 + 29 * Math.sin(ang)).toFixed(2)} y={(50 - 29 * Math.cos(ang) + 4).toFixed(2)}>
            {n}
          </text>
        );
      })}
      <g class="clock-hand hand-hour" ref={hourRef} style={`transform:rotate(${a.hour}deg)`}>
        <line x1="50" y1="54" x2="50" y2="27" />
      </g>
      <g class="clock-hand hand-minute" ref={minuteRef} style={`transform:rotate(${a.minute}deg)`}>
        <line x1="50" y1="56" x2="50" y2="13" />
      </g>
      <circle cx="50" cy="50" r="3.5" class="clock-pin" />
    </svg>
  );
}

export { moneyText };
