# Finance Simulation — Payment Routing

The finance world proves the engine is genuinely domain-agnostic: it is **not**
laid out on a grid, yet it runs on the same unchanged engine as the maze and
warehouse. The player authors the **decision layer inside payment
infrastructure** — given a payment and a set of providers, choose the safest,
cheapest, most reliable way to move the money.

> The player is not building a bank app. They are building the routing brain that
> decides, for each of thousands of transactions, *which provider handles it*.

All transaction amounts, provider fees, expected costs, processing costs, and
total costs are denominated and displayed in **Nigerian naira (NGN / ₦)**. The
engine keeps these as ordinary numeric values for comparisons and scoring;
currency formatting belongs to the Finance renderer and shared debug display.

Grounded in real payment-engineering practice: provider **health checks** and
**failover**, **expected-cost** routing (fee + expected failure cost), and —
reserved for later grades — **idempotent retries with backoff**.

---

## How it maps onto the engine

The engine loop is unchanged: **Observe → Decide → Act → Update → Render**. What
changes is what each step means.

| Engine concept | Finance meaning |
|---|---|
| One **tick** | One routing decision (kept as the universal step counter). |
| **Observation** | The payment at the head of the queue + every provider's live health. |
| **Action** | `routeToA` / `routeToB` / `routeToC` / `hold` / `decline`. |
| **Completion** (`resolveStatus`) | Every payment is terminal; a run with no successful payment ends `stuck`, not `reached`. |
| **Grading** (objectives) | Domain metrics: `totalCost`, `failed`, `lost`, `succeeded`. |

Ticks are deliberately retained (they count algorithmic work — number of
decisions); the money/quality metrics are layered **on top**, never a
replacement. A run is graded on outcomes (cost, failures), not tick count.

### Why no grid — but the grid still lives

A finance world carries a placeholder `1×1` grid so it satisfies the shared
`World` contract, and declares `tracksMovement: false` so the engine's
movement-based idle-stuck heuristic doesn't apply (finance owns its own
termination). It registers its own `FinanceRenderer` (queue + provider cards +
running tally). **The grid system is untouched** — every grid world keeps the
maze renderer; finance simply adds a second renderer beside it.

### Operational transfer-flow view

The Finance renderer is intentionally a process diagram rather than a board of
tiles. Above the existing **Now processing** card it renders one continuous
operational flow:

```text
Incoming queue → AI router → provider lanes
```

- **Incoming queue** shows the waiting transfers, with the head of the queue
  visually distinguished.
- **AI router** identifies the transfer currently being evaluated and the
  latest policy decision, including `hold` and `decline` rather than only
  completed routes.
- **Provider lanes** recalculate every tick. Available lanes are green, saturated
  lanes are amber, and offline lanes are red. Each lane shows live success rate,
  effective latency, active work, and remaining capacity; the lane used by the
  latest route is highlighted in blue.
- **Outcome chips** distinguish waiting, in-flight, succeeded, failed, declined,
  and timed-out payments. A terminal queue with exceptions is never labelled
  “cleared successfully.”
- The interview-grade total is explicitly labelled **penalty score — lower is
  better** and formatted to two decimals, so a large positive penalty cannot be
  mistaken for a good score.
This view is derived solely from the Finance runtime. It does not calculate or
display a “best provider” label; the cards show facts and the learner's policy
selects the route.

## The module

`lib/engine/worlds/finance.ts` implements the `WorldModule` seam — no engine core
edits. It owns:

- **Runtime**: the provider list, the transaction queue, running cost, and a
  seeded LCG (`seed`) so outcomes are **reproducible every run** — essential for
  using a stage fairly in an interview.
- **Actions**: `routeTo{A,B,C}` (book the fee; resolve success/failure by a
  seeded draw against the provider's reliability; add the failure penalty on a
  miss), `decline`, `hold` (waits; can expire a payment when `expireAfter` is
  set).
- **Hold safety**: holding is a legitimate temporary decision when capacity is
  expected to recover, but an unconditional hold policy eventually times
  payments out. If all payments become terminal without a single success, the
  world resolves as `stuck`. `allProcessed` still means that all items reached a
  terminal state so objectives can grade allowed timeout rates separately; it
  does not by itself mean the challenge passed.
- **Health over time**: each provider may carry a `schedule` of deterministic
  events (`{ atTick, online?, successRate?, latency? }`), so a provider can go
  offline or degrade partway through a run.
- **Observation vocabulary** (per tick): the current payment (`amount`,
  `isBusiness`/`isInternational`/`isHighValue`, `queueDepth`); per provider
  `online{A,B,C}`, `fee{A,B,C}`, `success{A,B,C}`, `latency{A,B,C}`,
  `expectedCost{A,B,C}`, `canRoute{A,B,C}`, and running totals
  `processed`, `succeeded`, `failed`, `declined`, `lost`, `totalCost`,
  `allProcessed`.
- **Routing outcomes**: routing to a provider is an attempt, not a hard-safety
  violation. An offline or unsuitable route is intentionally executed and
  recorded as a failed payment with its penalty. `canRouteX` remains an
  observation for authoring the correct branch; it is not an engine guard. This
  distinction makes failed-routing interview challenges meaningful.

`expectedCost = fee + (1 − successRate/100) × failurePenalty` — the number that
turns "cheap but flaky" vs "dear but safe" into one comparable score.

## No answer-revealing comparative conditions

The Finance module deliberately does **not** emit conditions such as `cheapestA`,
`mostReliableB`, or `bestValueC`. Those names would tell the author which provider
to choose before they had written a routing policy.

The world provides facts; the author supplies the policy. For a fixed-price
tutorial, where the provider cards establish that A is preferred, the correct
policy can be as small as:

```text
WHEN onlineA → routeToA
WHEN onlineB → routeToB
```

For a general routing algorithm, the author compares raw displayed facts such as
`feeA`, `successA`, and `expectedCostA`. The shipped reference brain demonstrates
this with raw condition expressions. This keeps the same world useful at three
levels: fixed preferred-provider failover, visual comparison rules, and Code-mode
routing algorithms.

## States and Code mode

Finance states describe the routing controller's operating mode, not a mutable
shortcut into the transaction queue. Useful modes include normal routing,
deadline protection, congestion control, and outage recovery. Ordered rules can
switch mode from live facts such as queue depth, deadline remaining, retry
history, and provider health. Finance itself remains responsible for moving
payments through waiting, processing, retryable, completed, declined, and lost
statuses.

The Code tab can run the same visible Finance world locally through an
object-oriented `decide(observation)` controller. Finance facts are read from
`observation.domain`, and the method returns `routeToA`, `routeToB`,
`routeToC`, `hold`, or `decline`. The included Finance example filters
ineligible providers, ranks urgent payments by reliability, and ordinary
payments by expected cost. This Code path is currently Apply & Run only; hidden
interview submission continues to evaluate the safe visual-policy DSL.

The level-21 regression controller does not memorize a provider name. It builds
the currently eligible provider set, avoids immediately retrying the provider
that just failed, and changes its ranking formula according to urgency. Urgent,
payroll, high-value, and near-deadline payments weight reliability, latency,
capacity, and congestion most heavily; flexible traffic gives expected cost
more influence. The unchanged controller is verified against all five visible
Peak Hour objectives in `lib/engine/__tests__/controller.test.ts`.

## The levels

Difficulty is placed as **Domain → Simulation → Tier → Grade** (see
[CHALLENGE_SCHEMA.md](./CHALLENGE_SCHEMA.md)), not a single number — each grade
adds a new *decision dimension*, not just more data.

| # | Level | Tier · Grade | New dimension |
|---|-------|--------------|---------------|
| 11 | Route the Payment | Tutorial · 1 | Pick the cheaper of two online providers. |
| 12 | Mind the Offline Provider | Tutorial · 2 | Availability — the cheapest is offline. |
| 13 | Cheap Can Cost More | Tutorial · 3 | Reliability as cost (fee + expected failure cost). |
| 14 | Three-Provider Routing | Easy · 1 | Consolidate availability and fee selection across three providers. |
| 15 | Cost and Reliability | Medium · 1 | Weighted score over competing objectives. |
| 16 | Real-Time Provider Health | Medium · 2 | Adapt continuously as health changes mid-run. |
| 20 | Intelligent Payment Routing | Medium · 3 | Eligibility, capacity, deadlines, retries, and hidden evaluation. |
| 21 | Peak Hour Payment Switch | Medium · 4 | Load-aware routing under surges, degradation, outages, and recovery. |
| 22 | Production Payment Orchestrator | Hard · 1 | 500-payment orchestration with adversarial server-only cases. |

Each tutorial level is deliberately simplified; core constraints (retries,
timeouts/expiry, capacity, mixed payment types) are introduced **incrementally**
in later grades, not all at once.

A single **best-value** reference brain
(`content/brains/finance/`) solves every one of these six levels — verified in
`lib/engine/__tests__/finance.test.ts`, which also covers offline-routing
failure, seeded determinism, scheduled health changes, and the termination
safety net.

Levels 20–22 form a separate interview-grade track. They add asynchronous
provider processing, finite concurrent capacity, generated arrivals, deadlines,
retry/backoff, compatibility and value restrictions, congestion, weighted
scoring, and server-side hidden suites. See
[FINANCE_INTERVIEW_TRACK.md](./FINANCE_INTERVIEW_TRACK.md).

## What comes later (not in this batch)

Idempotency-key correctness, exponential backoff, fraud/risk inspection,
multi-region routing, reconciliation, and settlement-ledger correctness remain
future simulations. The interview track now covers queue pressure, finite
capacity, deadlines, basic retry/backoff, and mixed transaction types.
