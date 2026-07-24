/**
 * Pure grid math: directions, movement deltas, and tile access.
 * No state lives here — these are helpers over a plain tile array.
 */

import { Direction, TileCode, TileKind, TILE, Vec2 } from "../types";

/** Clockwise order — turning right advances the index by one. */
export const DIRECTIONS: Direction[] = ["N", "E", "S", "W"];

const DELTAS: Record<Direction, Vec2> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};

export function delta(dir: Direction): Vec2 {
  return DELTAS[dir];
}

export function turnRight(dir: Direction): Direction {
  const i = DIRECTIONS.indexOf(dir);
  return DIRECTIONS[(i + 1) % 4];
}

export function turnLeft(dir: Direction): Direction {
  const i = DIRECTIONS.indexOf(dir);
  return DIRECTIONS[(i + 3) % 4];
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function equals(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

export function key(p: Vec2): string {
  return `${p.x},${p.y}`;
}

export function inBounds(tiles: number[][], p: Vec2): boolean {
  return p.y >= 0 && p.y < tiles.length && p.x >= 0 && p.x < tiles[p.y].length;
}

/** Raw tile code at a position, or WALL when out of bounds (treat edges as walls). */
export function tileCodeAt(tiles: number[][], p: Vec2): TileCode {
  if (!inBounds(tiles, p)) return TILE.WALL;
  return tiles[p.y][p.x] as TileCode;
}

export function tileKindAt(tiles: number[][], p: Vec2): TileKind {
  if (!inBounds(tiles, p)) return "out";
  switch (tiles[p.y][p.x]) {
    case TILE.WALL:
      return "wall";
    case TILE.START:
      return "start";
    case TILE.GOAL:
      return "goal";
    default:
      return "empty";
  }
}

/** A tile the agent may occupy (anything that isn't a wall or off-grid). */
export function isWalkable(tiles: number[][], p: Vec2): boolean {
  const kind = tileKindAt(tiles, p);
  return kind !== "wall" && kind !== "out";
}
