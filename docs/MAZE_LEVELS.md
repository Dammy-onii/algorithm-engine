# Maze Level Directory & Difficulty Policy

`/maze` is the Maze world's level directory. It is deliberately separate from
the Studio route: choosing a card navigates to `/maze/<challenge-id>`, where the
learner edits and runs that level's brain.

## Difficulty bands

Difficulty is a product-facing description of the constraints a level imposes;
it is not derived mechanically from grid area or from the engine's tile data.
Every world directory renders all four bands so new content has a stable home.

| Band | Constraint | Maze examples |
|---|---|---|
| Example | One isolated idea, short guided route, generous recovery space. | Straight Line, One Corner, Dead End |
| Easy | A genuine navigation problem: branches, at least one dead end, and several rules that must cooperate. | Snake Corridor, The Branching Maze |
| Medium | Several constraints must be balanced; a single local rule is insufficient. | Two Minds, One Robot |
| Hard | Long-horizon planning, optimisation, or ongoing/adversarial conditions with minimal scaffolding. | Reserved for future maze levels |

The directory uses `stage` when it is supplied by authored content and otherwise
maps legacy difficulty values (`1`, `2`, `3`) to Example, Easy, and Medium. This
keeps existing content compatible while making the presentation criteria explicit.

## The Branching Maze

`content/worlds/maze-proper.json` is an 11×11 bordered maze with a connected
start-to-goal route, multiple junctions, and dead-end branches. Its challenge
descriptor is `content/challenges/10-branching-maze.json`; `worldKey` resolves
through `app/lib/datasets.ts` just like every other authored level.

The level is intentionally **Easy**, not an example: its challenge is no longer
simply moving through a pre-shaped corridor. Learners must order arrival and
safety rules before movement fallbacks, react to wall observations, and recover
when a branch fails.
Its curriculum concept depends on reusable functions, but it does not require a
state machine.

## Authoring a future maze level

1. Add a `WorldData` JSON layout under `content/worlds/` and verify that its
   start and goal are connected.
2. Register its stable `worldKey` in `app/lib/datasets.ts`.
3. Add a challenge descriptor under `content/challenges/` with `pack: "maze"`,
   a difficulty/stage, objective vocabulary, and scaffold brain.
4. Add the challenge to `content/challenges/index.ts` and map it to exactly one
   curriculum concept in `lib/curriculum/concepts.ts`.
5. State the constraint that earns its difficulty band; do not classify it from
   grid size alone.
6. Run TypeScript, lint, and tests.
