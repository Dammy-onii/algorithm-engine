# Challenge Schema — the world-agnostic learner flow

Every challenge across Maze, Warehouse, Finance, and Parking renders the
**same** learner experience: a short brief, a live task checklist, escalating
hints, and a results screen. That consistency comes from one typed schema plus a
normalizer, so a new simulation type gets the whole flow for free by filling in
data. This doc is the reference for that schema.

Defined in [lib/authoring/types.ts](../lib/authoring/types.ts); normalized by
[lib/authoring/challengeBrief.ts](../lib/authoring/challengeBrief.ts).

---

## Two layers: structured + legacy

The structured fields remain **technically optional** so external or older
content can be normalized from the original free-text fields. Every challenge
published by this repository now authors them directly. The content tests reject
a bundled challenge without a brief, context, steps, staged hints, or complete
taxonomy.

| Structured field | Falls back to | Used for |
|---|---|---|
| `brief` | `objective` | The one-line **what to do**, always visible. |
| `context` | `tagline` | One line of scenario framing, always visible. |
| `steps[]` | required `objectives[]` | The **live task checklist**. |
| `taxonomy` | `pack` / `stage` / `difficulty` | Catalogue placement + the `Tier · Grade` badge. |
| `narrative`, `intelligenceExplanation` | — | Prose behind **Read problem statement**. |
| `hints[]` | `[hint]` | Escalating hint drawer. |
| `interviewEvaluation` | — | Public contract for an optional server-owned hidden suite. |

Long-form `narrative` and `intelligenceExplanation` text may contain blank lines
(`\n\n`). The shared brief splits those breaks into separate paragraphs and labels
the result as **Problem statement** and **How the starting brain behaves**. This
keeps every world readable without giving each simulation its own page layout.

An interview challenge may declare:

```ts
interviewEvaluation: {
  suiteId: string;
  scenarioCount: number;
  passingScore: number;
  rubric: string[];
}
```

The suite id and rubric are public, but the scenario inputs are not challenge
content. They stay in the server route graph. Studio receives labels, aggregate
metrics, diagnostic categories, and scores after submission.

## `steps` — the live checklist

```ts
interface TaskStep {
  id: string;
  label: string;      // plain-English "to-do" line
  check?: string;     // objective-grammar expression; omit for guidance-only
  hint?: string;      // optional per-step "how"
}
```

When `hint` is present, it is shown directly beneath the step in the live task
checklist. Use it for a short action-oriented explanation, not for a second
problem statement.

`check` uses the **same safe expression grammar** as rule conditions and
objectives, evaluated every tick against `liveContext(sim, brain)` — run-quality
metrics (`reached`, `ticks`, `rules`, …) merged over the current observation
(base flags **plus the active WorldModule's domain bag**). That is why a warehouse
step can say `carryingPackage || deliveredCount >= 1` and a maze step `reached`:
the vocabulary is whatever the world exposes. A step with no `check` is
informational; a malformed `check` reads as *not done* rather than throwing.

## `taxonomy` — Domain → Simulation → Tier → Grade

```ts
interface ChallengeTaxonomy {
  domain?: string;      // "Maze" | "Warehouse" | "Finance"
  simulation?: string;  // "Navigation" | "Fulfilment" | "Payment Routing"
  tier?: "tutorial" | "easy" | "medium" | "hard";
  grade?: number;       // complexity ladder within a tier: 1, 5, 10, 20…
}
```

Difficulty on a simulation platform is not a single axis (entities, constraints,
time pressure, uncertainty, competing objectives, memory, failure handling all
vary independently), so a challenge is *placed*, not just numbered. `taxonomyFor`
returns a `badge` (`Tutorial · Grade 1`) and `full` label, inferring sensible
values from the legacy `pack`/`stage`/`difficulty` when `taxonomy` is absent.

---

## Worked example (warehouse first delivery)

```jsonc
{
  "taxonomy": { "domain": "Warehouse", "simulation": "Fulfilment", "tier": "tutorial", "grade": 1 },
  "brief":   "Teach the robot to pick up the waiting order and drop it at Outbound A.",
  "context": "One order, one outbound dock. The robot already drives the aisle.",
  "steps": [
    { "id": "pick",    "label": "Load the waiting package",    "check": "carryingPackage || deliveredCount >= 1" },
    { "id": "deliver", "label": "Deliver it to Outbound A",     "check": "deliveredCount >= 1" }
  ]
}
```

See [content/challenges/warehouse/06-warehouse-first-delivery.json](../content/challenges/warehouse/06-warehouse-first-delivery.json).

## Published-content consistency contract

A bundled challenge must satisfy all of these:

1. `brief`, `context`, `narrative`, `intelligenceExplanation`, and
   `learningObjective` describe the actual world and scaffold, not a planned
   feature.
2. Required objectives enforce every claim made by the primary objective. A
   cost-optimization problem cannot pass merely because its queue drained.
3. `steps` use real run metrics or active-world observations. A guidance-only
   step omits `check` rather than using a condition that is already true.
4. `availableConditions` must come from the base observation vocabulary or the
   selected `WorldModule`.
5. Every `availableBrick` must exist in the scaffold with an action/sequence and
   a learner-facing description.
6. Rules are described in authored top-to-bottom order. Numeric `priority`
   fields may remain in legacy JSON for compatibility, but learner text must
   never claim they control execution.
7. `stage` and `taxonomy.tier` agree (`practice` is presented as `tutorial`).

These checks run in `lib/content/__tests__/registry.test.ts`. The same schema
supports future worlds without a new problem-flow UI.
