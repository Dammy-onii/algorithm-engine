# Challenge Schema — the world-agnostic learner flow

Every challenge — maze, warehouse, and the upcoming finance world — renders the
**same** learner experience: a short brief, a live task checklist, escalating
hints, and a results screen. That consistency comes from one typed schema plus a
normalizer, so a new simulation type gets the whole flow for free by filling in
data. This doc is the reference for that schema.

Defined in [lib/authoring/types.ts](../lib/authoring/types.ts); normalized by
[lib/authoring/challengeBrief.ts](../lib/authoring/challengeBrief.ts).

---

## Two layers: structured + legacy

The structured fields are **optional and layered over** the original free-text
fields. Older challenges keep working (the normalizer derives a brief from
`objective` / `tagline` / `narrative` / objectives); new challenges author the
structured fields directly. Nothing is a hard migration.

| Structured field | Falls back to | Used for |
|---|---|---|
| `brief` | `objective` | The one-line **what to do**, always visible. |
| `context` | `tagline` | One line of scenario framing, always visible. |
| `steps[]` | required `objectives[]` | The **live task checklist**. |
| `taxonomy` | `pack` / `stage` / `difficulty` | Catalogue placement + the `Tier · Grade` badge. |
| `narrative`, `intelligenceExplanation` | — | Prose behind **Learn more**. |
| `hints[]` | `[hint]` | Escalating hint drawer. |

## `steps` — the live checklist

```ts
interface TaskStep {
  id: string;
  label: string;      // plain-English "to-do" line
  check?: string;     // objective-grammar expression; omit for guidance-only
  hint?: string;      // optional per-step "how"
}
```

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

## Why this matters for new worlds

When the finance (Payment Routing) world lands, its levels declare
`taxonomy` (`Finance · Payment Routing · Easy · Grade 1`), a `brief`, and `steps`
whose `check` references finance domain flags (e.g. `allRouted`,
`failuresWithinBudget`). No new flow UI is needed — the brief, checklist, hints,
stepper, and results screen all render from this same schema.
