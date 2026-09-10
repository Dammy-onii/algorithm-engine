/**
 * A miniature of the real CTRL loop: observe -> decide -> act -> update.
 *
 * The point of this module is the same as the point of the product: the engine
 * below knows how to move an agent and update a world, and nothing at all about
 * *why* a move was chosen. That decision comes from `RULES`, which is plain data
 * — exactly the shape a user would author in the studio.
 */

export type Dir = 0 | 1 | 2 | 3; // 0 N, 1 E, 2 S, 3 W

export type Cell = "." | "#" | "G";

export interface Agent {
  x: number;
  y: number;
  dir: Dir;
}

export interface Observation {
  wallAhead: boolean;
  wallRight: boolean;
  wallLeft: boolean;
  atGoal: boolean;
}

/** An action the engine knows how to execute. */
export type Action = "moveForward" | "turnLeft" | "turnRight";

export interface Rule {
  id: string;
  /** Human-readable condition, rendered in the UI. */
  label: string;
  /** The authored predicate over the observation. */
  when: (o: Observation) => boolean;
  /** A multi-step brick: one action is committed per tick. */
  steps: Action[];
  /** Plain-English action, rendered in the UI. */
  does: string;
}

/**
 * A right-hand wall follower — the first algorithm most people write, and the
 * one whose behaviour is most legible when you watch it rather than read it.
 */
export const RULES: Rule[] = [
  {
    id: "R1",
    label: "right is clear",
    when: (o) => !o.wallRight,
    steps: ["turnRight", "moveForward"],
    does: "turn right, then advance",
  },
  {
    id: "R2",
    label: "path ahead is clear",
    when: (o) => !o.wallAhead,
    steps: ["moveForward"],
    does: "advance",
  },
  {
    id: "R3",
    label: "otherwise",
    when: () => true,
    steps: ["turnLeft"],
    does: "turn left",
  },
];

// A perfect (spanning-tree) maze, which is what makes a right-hand follower a
// *correct* algorithm here rather than a lucky one. Solves in 69 ticks.
const RAW_MAZE = [
  "###############",
  "#.#...........#",
  "#.#####.###.#.#",
  "#.....#.#...#.#",
  "#####.#.#.###.#",
  "#.#...#.#.#.#.#",
  "#.#.#####.#.#.#",
  "#.#.#.....#.#.#",
  "#.#.#.#####.#.#",
  "#.....#......G#",
  "###############",
];

export const MAZE: Cell[][] = RAW_MAZE.map(
  (row) => [...row].map((c) => (c === "#" ? "#" : c === "G" ? "G" : ".")) as Cell[],
);

export const MAZE_W = MAZE[0].length;
export const MAZE_H = MAZE.length;
export const START: Agent = { x: 1, y: 1, dir: 1 };

const DELTA: Record<Dir, [number, number]> = {
  0: [0, -1],
  1: [1, 0],
  2: [0, 1],
  3: [-1, 0],
};

const isWall = (x: number, y: number): boolean =>
  y < 0 || y >= MAZE_H || x < 0 || x >= MAZE_W || MAZE[y][x] === "#";

const ahead = (a: Agent, turn: number): boolean => {
  const d = (((a.dir + turn) % 4) + 4) % 4 as Dir;
  const [dx, dy] = DELTA[d];
  return isWall(a.x + dx, a.y + dy);
};

export const observe = (a: Agent): Observation => ({
  wallAhead: ahead(a, 0),
  wallRight: ahead(a, 1),
  wallLeft: ahead(a, -1),
  atGoal: MAZE[a.y][a.x] === "G",
});

/** Pick the first rule whose condition holds. Order *is* the priority. */
export const decide = (o: Observation, rules: Rule[] = RULES): Rule =>
  rules.find((r) => r.when(o)) ?? rules[rules.length - 1];

export const act = (a: Agent, action: Action): Agent => {
  if (action === "turnLeft") return { ...a, dir: ((a.dir + 3) % 4) as Dir };
  if (action === "turnRight") return { ...a, dir: ((a.dir + 1) % 4) as Dir };
  const [dx, dy] = DELTA[a.dir];
  if (isWall(a.x + dx, a.y + dy)) return a;
  return { ...a, x: a.x + dx, y: a.y + dy };
};

export interface SimState {
  agent: Agent;
  tick: number;
  /** Remaining actions of the brick currently being executed. */
  plan: Action[];
  activeRule: string;
  lastAction: Action | null;
  trail: string[];
  solved: boolean;
}

export const initialState = (): SimState => ({
  agent: { ...START },
  tick: 0,
  plan: [],
  activeRule: "R1",
  lastAction: null,
  trail: [`${START.x},${START.y}`],
  solved: false,
});

/** One turn of the loop. Returns the next state. */
export const step = (s: SimState, rules: Rule[] = RULES): SimState => {
  if (s.solved) return s;

  let plan = s.plan;
  let activeRule = s.activeRule;

  // Only consult the rules when the previous brick has finished. A committed
  // behaviour runs to completion — that is what makes bricks feel deliberate.
  if (plan.length === 0) {
    const rule = decide(observe(s.agent), rules);
    plan = [...rule.steps];
    activeRule = rule.id;
  }

  const [action, ...rest] = plan;
  const agent = act(s.agent, action);
  const key = `${agent.x},${agent.y}`;
  const trail = s.trail.includes(key) ? s.trail : [...s.trail, key];

  return {
    agent,
    tick: s.tick + 1,
    plan: rest,
    activeRule,
    lastAction: action,
    trail,
    solved: MAZE[agent.y][agent.x] === "G",
  };
};
