// 🎤 The stage map: spotlight beams from above, speakers along the edges, little stars and stage
// boards; rounded "gem" stations on a neon path. Colours: CSS variables only.
import { starPath } from '../../fx/Hero';
import { sceneryRows } from '../bossParts';
import type { MapSkin } from '../types';

function Scenery({ width, height }: { width: number; height: number }) {
  return (
    <g>
      {sceneryRows(height, 360, 0).map(({ y, side, i }) => (
        <path key={`b${i}`} d={side ? `M${width} ${y} L${width - 40} ${y} L${width / 2 - 60} ${y + 300} L${width / 2 + 40} ${y + 300} Z` : `M0 ${y} L40 ${y} L${width / 2 + 60} ${y + 300} L${width / 2 - 40} ${y + 300} Z`} fill="var(--accent)" opacity="0.12" />
      ))}
      {sceneryRows(height, 230, 100).map(({ y, side, i }) => {
        const x = side ? width - 24 : 24;
        return (
          <g key={i}>
            <g opacity="0.6">
              <rect x={x - 14} y={y - 22} width="28" height="44" rx="4" fill="var(--map-deco)" />
              <circle cx={x} cy={y - 8} r="6" fill="var(--map-bg)" />
              <circle cx={x} cy={y + 10} r="9" fill="var(--map-bg)" />
            </g>
            <path d={starPath(side ? 70 : width - 70, y + 110, 6)} fill="var(--num-2)" opacity="0.35" />
            <path d={starPath(side ? 40 : width - 40, y + 150, 4)} fill="var(--accent)" opacity="0.5" />
          </g>
        );
      })}
    </g>
  );
}

export const mapSkin: MapSkin = { Scenery, node: 'gem', path: 'neon', sectionIcons: ['🎤', '🎶'] };
