// 🏀 The basketball map: a wooden court (planks), painted arcs and keys, hoops at the sides,
// thick round stations on a court-line path. Colours: CSS variables only.
import { sceneryRows } from '../bossParts';
import type { MapSkin } from '../types';

function Scenery({ width, height }: { width: number; height: number }) {
  const planks: number[] = [];
  for (let x = 24; x < width; x += 36) planks.push(x);
  return (
    <g>
      <g stroke="var(--map-deco)" stroke-width="3">
        {planks.map((x) => (
          <path key={x} d={`M${x} 0 V${height}`} />
        ))}
      </g>
      <g fill="none" stroke="var(--num-4)" stroke-width="3" opacity="0.3">
        {sceneryRows(height, 460, 230).map(({ y, i }) => (
          <g key={i}>
            <path d={`M30 ${y - 120} Q${width / 2} ${y + 90} ${width - 30} ${y - 120}`} />
            <rect x={width / 2 - 40} y={y - 120} width="80" height="70" />
            <circle cx={width / 2} cy={y - 50} r="34" />
          </g>
        ))}
      </g>
      {sceneryRows(height, 260, 110).map(({ y, side, i }) => {
        const x = side ? width - 26 : 26;
        return (
          <g key={`h${i}`} opacity="0.55">
            <rect x={x - 16} y={y - 22} width="32" height="22" rx="2" fill="var(--surface)" stroke="var(--ink-soft)" stroke-width="2" />
            <ellipse cx={x} cy={y + 2} rx="10" ry="3.5" fill="none" stroke="var(--num-4)" stroke-width="3" />
            <path d={`M${x - 9} ${y + 3} l3 12 M${x} ${y + 5} v12 M${x + 9} ${y + 3} l-3 12`} stroke="var(--ink-soft)" stroke-width="1.2" />
          </g>
        );
      })}
    </g>
  );
}

export const mapSkin: MapSkin = { Scenery, node: 'round', path: 'court', sectionIcons: ['🏀', '🏆'] };
