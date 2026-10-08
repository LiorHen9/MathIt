// 🧚 The fairies' map: soft clouds, flowers and little stars along the edges of a pink garden;
// petal-shaped stations on a sparkling path. Colours: CSS variables only.
import { starPath } from '../../fx/Hero';
import { sceneryRows } from '../bossParts';
import type { MapSkin } from '../types';

function Scenery({ width, height }: { width: number; height: number }) {
  return (
    <g>
      {sceneryRows(height, 190).map(({ y, side, i }) => {
        const x = side ? width - 30 : 30;
        return (
          <g key={i}>
            {/* A cloud */}
            <g fill="var(--map-deco)">
              <circle cx={x - 14} cy={y} r="13" />
              <circle cx={x + 2} cy={y - 7} r="16" />
              <circle cx={x + 18} cy={y + 1} r="12" />
              <rect x={x - 26} y={y} width="54" height="12" rx="6" />
            </g>
            {/* A flower lower down, on the other side */}
            <g transform={`translate(${side ? 26 : width - 26} ${y + 95})`}>
              <path d="M0 6 Q2 18 0 28" stroke="var(--good)" stroke-width="2.5" fill="none" opacity="0.5" />
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 6} cy={Math.sin((a * Math.PI) / 180) * 6} r="5" fill="var(--num-1)" opacity="0.32" />
              ))}
              <circle r="3.5" fill="var(--accent)" opacity="0.6" />
            </g>
            <path d={starPath(side ? width - 60 : 60, y + 50, 5)} fill="var(--accent)" opacity="0.45" />
          </g>
        );
      })}
    </g>
  );
}

export const mapSkin: MapSkin = { Scenery, node: 'petal', path: 'sparkle', sectionIcons: ['🌸', '🍄'] };
