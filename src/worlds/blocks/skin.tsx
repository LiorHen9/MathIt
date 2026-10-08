// 🧱 The blocks map: cave walls of stone blocks along the edges, gems in the stone and torches;
// square stations on a path of blocks. Colours: CSS variables only.
import { sceneryRows } from '../bossParts';
import type { MapSkin } from '../types';

function Scenery({ width, height }: { width: number; height: number }) {
  const rows: number[] = [];
  for (let y = 0; y < height; y += 24) rows.push(y);
  return (
    <g>
      {/* The cave walls: two columns of blocks on each side, staggered */}
      <g fill="var(--map-deco)" stroke="var(--map-bg)" stroke-width="2">
        {rows.map((y, k) => (
          <g key={y}>
            <rect x={k % 2 ? -12 : 0} y={y} width="24" height="24" />
            <rect x={k % 2 ? 12 : 24} y={y} width={k % 3 ? 12 : 24} height="24" />
            <rect x={width - (k % 2 ? 12 : 24)} y={y} width="24" height="24" />
            <rect x={width - (k % 2 ? 24 : 48) + (k % 3 ? 12 : 0)} y={y} width={k % 3 ? 12 : 24} height="24" />
          </g>
        ))}
      </g>
      {sceneryRows(height, 170, 80).map(({ y, side, i }) => (
        <g key={i}>
          <path d={`M${side ? width - 18 : 18} ${y - 8} l7 8 l-7 8 l-7 -8 z`} fill={i % 2 ? 'var(--num-2)' : 'var(--accent)'} opacity="0.7" />
          {i % 2 === 0 && (
            <g transform={`translate(${side ? 60 : width - 60} ${y + 70})`} opacity="0.6">
              <rect x="-2" y="0" width="4" height="18" fill="var(--ink-soft)" />
              <rect x="-4" y="-8" width="8" height="8" fill="var(--accent)" />
              <rect x="-2" y="-12" width="4" height="4" fill="var(--num-4)" />
            </g>
          )}
        </g>
      ))}
    </g>
  );
}

export const mapSkin: MapSkin = { Scenery, node: 'square', path: 'blocks', sectionIcons: ['⛏️', '💎'] };
