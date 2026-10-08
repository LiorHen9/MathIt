// ⚽ The football map: a mowed pitch (stripes), chalk lines – centre circles, penalty boxes,
// corner flags – and ball-like stations on a chalk path. Colours: CSS variables only.
import { sceneryRows } from '../bossParts';
import type { MapSkin } from '../types';

function Scenery({ width, height }: { width: number; height: number }) {
  const stripes: number[] = [];
  for (let y = 0; y < height; y += 90) stripes.push(y);
  return (
    <g>
      {stripes.map((y) => (
        <rect key={y} x="0" y={y} width={width} height="45" fill="var(--map-deco)" />
      ))}
      <g fill="none" stroke="var(--surface)" stroke-width="3" opacity="0.75">
        <rect x="10" y="10" width={width - 20} height={height - 20} rx="4" />
        {sceneryRows(height, 420, 210).map(({ y, i }) => (
          <g key={i}>
            <path d={`M10 ${y} H${width - 10}`} />
            <circle cx={width / 2} cy={y} r="46" />
            <path d={`M${width / 2 - 70} ${y + 210} v-40 h140 v40`} />
          </g>
        ))}
      </g>
      {sceneryRows(height, 300, 120).map(({ y, side, i }) => {
        const x = side ? width - 22 : 22;
        return (
          <g key={`f${i}`}>
            <path d={`M${x} ${y} v-26`} stroke="var(--ink-soft)" stroke-width="2.5" opacity="0.5" />
            <path d={`M${x} ${y - 26} l${side ? -14 : 14} 6 l${side ? 14 : -14} 6 z`} fill="var(--num-1)" opacity="0.5" />
          </g>
        );
      })}
    </g>
  );
}

export const mapSkin: MapSkin = { Scenery, node: 'ball', path: 'chalk', sectionIcons: ['⚽', '🥅'] };
