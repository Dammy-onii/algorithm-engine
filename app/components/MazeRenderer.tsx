"use client";

/**
 * Deliberately simple rendering — colored squares, per the milestone brief.
 * The point is to *watch the decision engine*, not to produce polished graphics.
 *
 * Responsive: the board fills the width of its container (up to a max cell size)
 * and cells stay square via `aspect-square`, so a large grid never overflows a
 * narrow column. The robot is an SVG triangle and the goal a dot, both sized as a
 * fraction of the cell so they scale with it.
 */

import { Direction, TILE } from "@/lib/engine/types";
import { World } from "@/lib/engine/world/world";
import { key } from "@/lib/engine/world/grid";

/** Degrees to rotate a right-pointing triangle so it faces each direction. */
const ROTATION: Record<Direction, number> = { E: 0, S: 90, W: 180, N: 270 };

const MAX_CELL = 40; // px — cap so small grids don't get huge

export function MazeRenderer({ world }: { world: World }) {
  const { tiles, width, height, agent, goal, start } = world;
  const gap = 2;
  const pad = 8;
  // Cap the overall board width so small grids stay compact, but let the grid
  // shrink to 100% of a narrow container (the columns are fractional units).
  const maxBoardWidth = width * MAX_CELL + (width - 1) * gap + pad * 2;

  return (
    <div
      className="grid w-full rounded-lg bg-zinc-900"
      style={{
        gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        gap,
        padding: pad,
        maxWidth: maxBoardWidth,
        // Keep the board itself square-ish to its aspect (width:height cells).
        aspectRatio: `${width} / ${height}`,
      }}
    >
      {tiles.flatMap((row, y) =>
        row.map((code, x) => {
          const here = { x, y };
          const isAgent = agent.position.x === x && agent.position.y === y;
          const isGoal = goal.x === x && goal.y === y;
          const isStart = start.x === x && start.y === y;
          const visited = agent.visited.has(key(here));

          // Fixed grayscale board — identical in light and dark mode. The dark
          // frame with light tiles reads clearly against either page background.
          let cls = "bg-zinc-100"; // empty (walkable)
          if (code === TILE.WALL) cls = "bg-zinc-700";
          else if (isGoal) cls = "bg-white ring-2 ring-inset ring-zinc-900";
          else if (visited) cls = "bg-zinc-300";
          else if (isStart) cls = "bg-zinc-100 ring-1 ring-inset ring-zinc-400";

          return (
            <div
              key={`${x}-${y}`}
              className={`flex aspect-square items-center justify-center rounded-[3px] ${cls}`}
              title={`(${x},${y})`}
            >
              {isAgent ? (
                <svg
                  viewBox="0 0 10 10"
                  className="h-[46%] w-[46%] fill-zinc-900"
                  style={{ transform: `rotate(${ROTATION[agent.direction]}deg)` }}
                  aria-label={`robot facing ${agent.direction}`}
                >
                  <path d="M2 1 L9 5 L2 9 Z" />
                </svg>
              ) : isGoal ? (
                <span className="h-[28%] w-[28%] rounded-full bg-zinc-900" />
              ) : null}
            </div>
          );
        }),
      )}
    </div>
  );
}
