# Milestone 2 — Intelligence Authoring System

> **Historical design record.** This document preserves the original Milestone 2
> plan, including the former five-layer terminology and the later-removed Maze
> level 5. For the current six-layer editor and published challenge catalogue,
> read [RULES.md](./RULES.md), [ARCHITECTURE.md](./ARCHITECTURE.md), and
> [ROUTING_AND_STRUCTURE.md](./ROUTING_AND_STRUCTURE.md).

## What this milestone proves

Milestone 1 proved the engine can execute instructions stored in files.
Milestone 2 proves those instructions can be **authored through an interface**
rather than hand-written as JSON. The engine stays completely unchanged. The output
of the authoring system is the same five JSON files the engine already understands.

By the end of this milestone someone who has never seen a JSON file should be able
to open a challenge, use the visual editor to design the robot's behavior, press Run,
and watch the robot respond in real time.

---

## Architecture

```
lib/authoring/           ← NEW (framework-agnostic, no React)
├── types.ts             ← VisualBrain model: all five layers in UI-friendly form
├── brainCompiler.ts     ← VisualBrain → BrainSource (feeds the unchanged engine)
├── brainDecompiler.ts   ← BrainSource → VisualBrain (loads existing brains into editor)
└── brainSummarizer.ts   ← VisualBrain → plain-English summary (powers intelligence panel)

challenges/              ← NEW (local JSON, no backend)
├── 01-straight-line.json
├── 02-one-corner.json
├── 03-dead-end.json
├── 04-snake-corridor.json
├── 05-open-arena.json
└── index.ts             ← registry + localStorage helpers

content/worlds/          ← 3 new world files
├── challenge-straight.json   (7×3)
├── challenge-corner.json     (5×5)
└── challenge-arena.json      (9×9)

features/studio/components/   ← NEW UI layer
├── ChallengeSelector.tsx
├── AuthoringPanel.tsx
├── BrainIntelligence.tsx
├── layers/
│   ├── GoalEditor.tsx
│   ├── StateEditor.tsx
│   ├── RuleBuilder.tsx
│   ├── FunctionComposer.tsx
│   └── MemoryEditor.tsx
└── blocks/
    ├── PrimitiveBlock.tsx
    └── ConditionChip.tsx

app/page.tsx             ← Combined Studio + Lab page (mode toggle)
```

## Data flow

```
Challenge JSON (scaffold) → decompileBrain → VisualBrain (editor state)
                                                ↓ (user edits)
                                            VisualBrain
                                                ↓ compileBrain (on "Apply & Run")
                                            BrainSource
                                                ↓ new Simulation(world, brainSource)
                                            Engine tick loop → SimStep → UI
```

## The progression model

| Level | What the user does | Functions tab |
|-------|--------------------|---------------|
| 1 | Arrange pre-built bricks in rules; pick conditions from chips | Locked |
| 2 | Compose custom multi-step functions from engine primitives | Unlocked |

Engine primitives (`moveForward`, `turnLeft`, `turnRight`, `wait`) are always
owned by the engine. Users never redefine them — they compose above them.

## Challenges

| # | Name | Level | World | Teaches |
|---|------|-------|-------|---------|
| 1 | The Straight Run | 1 | 7×3 corridor | One rule: condition + action |
| 2 | The First Corner | 1 | 5×5 L-shape | Top-to-bottom rule ordering |
| 3 | No Way Out | 1 | 7×7 (small) | Compound AND conditions |
| 4 | Build Your Own Strategy | 2 | 11×11 snake | Composing custom functions |
| 5 | Two Minds, One Robot | 2 | 9×9 arena | State machine with transitions |

## Design rules (do not violate)

All design rules from `BUILD.md` apply. Additionally:

1. **The authoring layer never touches the engine directly.** It only produces a `BrainSource` and calls `new Simulation()`.
2. **Engine primitives are locked in the UI.** Users can compose above them, not replace them.
3. **Local-first persistence.** Challenge progress is stored in `localStorage`. No backend required in M2.
4. **Every brain the visual editor produces is valid JSON.** The "Show JSON" toggle proves this at any time.

## Key types

See `lib/authoring/types.ts` for the `VisualBrain`, `VisualRule`, `VisualCondition`, and `ChallengeData` types.

Condition model:
- **Guided mode:** a list of `ConditionAtom` objects joined by `&&` or `||`
- **Raw mode:** a plain string (advanced fallback, same as M1)
- Complex nested expressions → automatically fall back to raw mode in the decompiler
