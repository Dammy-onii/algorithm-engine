# Algorithm Engine — Project Summary

> A condensed reference distilled from [`summary.md`](./summary.md). That file is the
> canonical vision document; this is the fast-onboarding version.

## One sentence

**Algorithm Engine is a generic simulation engine that runs an autonomous agent
inside a world through a continuous observe → decide → act → update → render loop,
where the agent's intelligence is defined by external instruction files, not by the
engine itself.**

## What it is *not*

- Not a maze game. The maze is only the first, simplest test environment.
- Not another Scratch-style visual programming toy.
- Not a place where the engine contains the robot's logic.

## The core idea

Algorithms should be **experienced, not just read**. Instead of watching code
compile or reading test output, a user watches an agent behave according to logic
they designed. The engine's single most important architectural rule:

> **The engine executes intelligence — it does not create it.**

The engine never has direct knowledge of the agent's reasoning. It hands the agent
an **observation** (only what the agent is allowed to know), receives back exactly
**one action**, executes it, updates the world, and repeats.

## The decision hierarchy (the "brain")

Mirrors how humans make decisions — goals and strategies down to reflexes:

| Layer | Question it answers | Example |
|-------|--------------------|---------|
| **Goals** | What are my priorities? | Reach the exit; conserve energy |
| **State machine** | What mode am I in right now? | Exploring / Returning / Avoiding |
| **Rules** | Given my situation, what should happen? | "If wall ahead, turn right" |
| **Functions** | How does it actually happen? | `FollowWall`, `MoveToGoal` |
| **Memory** | What have I learned? | Visited cells, known obstacles |
| **Capabilities** | What actions am I even able to do? | Scan, build bridge, long-range sensor |

Functions/strategies are meant to become **reusable, evolving assets** in a player's
personal library — assembling and refining a toolkit rather than starting from
scratch each challenge (separation of concerns, modularity, composition).

## Why start with the engine

The solo experience validates the one question everything else depends on:
**Can people understand algorithms by watching them?** If yes, every later feature
is just a new *source of instructions* for the same engine.

## Long-term evolution (phases)

1. **Solo Challenge Mode** — progressively harder algorithmic challenges with
   measurable objectives (fewest moves, lowest energy, fastest completion).
2. **Visual Programming** — build algorithms from logic components instead of typing.
3. **Hybrid Programming** — expand a block into real JS/Python; replace blocks with
   handwritten code against the same simulation.
4. **Multiplayer Competitions** — many players solve one challenge; spectators watch
   consequences, not code.
5. **Professional Applications** — technical interviews, education, recruitment
   competitions, live esports.

**One engine. Multiple interfaces.** The engine stays unchanged; only the source of
the instructions evolves.

## Current product state

The original milestone documents record how the platform was built; they are not
the current behaviour reference. Today the platform has multiple worlds,
world modules, ordered visual rules, composed functions, and an optional
object-oriented Code mode controller. Read [`CHANGELOG.md`](./CHANGELOG.md) for
the latest implemented changes, [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the
runtime contract, and [`RULES.md`](./RULES.md) for both authoring modes.

## Writing a brain

All five brain layers are editable live in the browser and on disk. The authoring
guide — rule fields, the condition language, single- and multi-step bricks, and a
walkthrough — is in [`RULES.md`](./RULES.md).
