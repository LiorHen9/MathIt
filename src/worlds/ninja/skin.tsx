// 🥷 The ninja map: a paper-screen dojo (shoji grid), bamboo along the edges, a moon, tiled
// stations on a path of stepping stones. Colours: CSS variables only.
import { sceneryRows } from '../bossParts';
import type { MapSkin } from '../types';

function Bamboo({ x, y }: { x: number; y: number }) {
  return (
    <g fill="var(--map-deco)">
      {[0, 1, 2, 3].map((k) => (
        <rect key={k} x={x - 5} y={y + k * 34} width="10" height="31" rx="3" />
      ))}
      <path d={`M${x + 4} ${y + 40} q16 -10 26 -4 q-14 2 -26 10 z`} />
      <path d={`M${x - 4} ${y + 82} q-16 -10 -26 -4 q14 2 26 10 z`} />
    </g>
  );
}

function Scenery({ width, height }: { width: number; height: number }) {
  return (
    <g>
      {/* Shoji panels: a faint grid */}
      <g stroke="var(--map-deco)" stroke-width="2" opacity="0.6">
        {sceneryRows(height, 60, 30).map(({ y }) => (
          <path key={`h${y}`} d={`M0 ${y} H${width}`} />
        ))}
        {[60, 120, 180, 240, 300].map((x) => (
          <path key={`v${x}`} d={`M${x} 0 V${height}`} />
        ))}
      </g>
      {sceneryRows(height, 300, 40).map(({ y, side, i }) => (
        <g key={i}>
          <Bamboo x={side ? width - 18 : 18} y={y} />
          {i % 2 === 0 && <circle cx={side ? 70 : width - 70} cy={y + 170} r="22" fill="var(--accent)" opacity="0.25" />}
        </g>
      ))}
    </g>
  );
}

export const mapSkin: MapSkin = { Scenery, node: 'tile', path: 'stones', sectionIcons: ['🥋', '🏯'] };
