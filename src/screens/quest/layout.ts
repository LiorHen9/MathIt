// Where everything sits on the quest map, in map units: the map is MAP_W wide and as tall as it
// needs; the screen scales it to its width. Stations go top to bottom on a winding path, with a
// banner at the start of every section. Pure: the same journey always gives the same layout.
import { type Journey, type QuestNode } from '../../core/quest/index';

export const MAP_W = 360;
const MID = MAP_W / 2;
/** How far the path swings left and right of the middle. */
const SWING = 92;

export interface Spot {
  node: QuestNode;
  index: number;
  x: number;
  y: number;
  /** Station diameter (map units): the boss is bigger. */
  size: number;
}

export interface Banner {
  id: string;
  title: string;
  y: number;
}

export interface MapLayout {
  spots: Spot[];
  banners: Banner[];
  /** One path per gap between stations: segment i goes from station i to station i + 1. */
  segments: string[];
  height: number;
}

export function mapLayout(j: Journey): MapLayout {
  const spots: Spot[] = [];
  const banners: Banner[] = [];
  let y = 8;
  let i = 0;
  for (const ch of j.chapters) {
    for (const s of ch.sections) {
      banners.push({ id: s.id, title: s.title, y: y + 26 });
      y += 66;
      for (const node of s.nodes) {
        y += 52;
        const boss = node.kind === 'boss';
        if (boss) y += 14;
        spots.push({ node, index: i, x: boss ? MID : Math.round(MID + SWING * Math.sin(i * 0.8)), y, size: boss ? 86 : node.kind === 'chest' ? 70 : 64 });
        y += boss ? 84 : 66;
        i++;
      }
    }
  }
  const segments = spots.slice(1).map((b, k) => {
    const a = spots[k];
    const dy = b.y - a.y;
    return `M${a.x} ${a.y} C${a.x} ${a.y + dy * 0.55} ${b.x} ${b.y - dy * 0.55} ${b.x} ${b.y}`;
  });
  return { spots, banners, segments, height: y + 24 };
}

/** The hero stands beside a station (not on it, so the station stays easy to tap): toward the middle. */
export function heroSide(s: Spot): number {
  return s.x > MID + 4 ? -1 : 1;
}

/** Where the hero's feet go next to a station (map units). */
export function heroSpot(s: Spot): { x: number; y: number } {
  return { x: s.x + heroSide(s) * (s.size / 2 + 26), y: s.y + 22 };
}
