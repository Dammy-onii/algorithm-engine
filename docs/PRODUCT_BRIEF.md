# Algorithm Engine — Product Brief

*A self-contained summary. Paste this into a new conversation, hand it to a
designer, or use it as the source copy for a marketing site.*

---

## One-liner

**Algorithm Engine is a simulation platform where people build the decision-making
intelligence behind real-world systems — and watch it run.**

Instead of solving puzzle questions, users author the logic that controls an
autonomous agent inside a realistic operational environment: a warehouse robot, a
supermarket restocking bot, a payment switch, or a parking facility. Then they press run and watch their logic play
out, decision by decision.

## The problem it solves

Traditional coding tests answer one question: *did they get the right answer?*

They don't show **how someone thinks** — how they decompose a system, prioritise
competing goals, handle failure, or adapt when conditions change. Those are the
qualities that actually predict engineering ability, and they're invisible in a
LeetCode score.

Algorithm Engine makes reasoning observable. Every decision the agent makes is
visible, traceable, and scored on real outcomes.

## Core principle

> **The engine executes intelligence — it never creates it.**

The simulation engine owns the world: it updates state, applies actions, enforces
what's physically possible, and keeps score. It contains **zero problem-solving
logic**. Every decision comes from logic the user authors. Success depends
entirely on the quality of the intelligence they design.

## How it works

Every simulation runs the same loop:

**Observe → Decide → Act → Update → Repeat**

1. The engine gives the agent an **observation** — only what it can legitimately
   sense right now.
2. The user's authored logic **decides** one action.
3. The engine **executes** that action, updates the world, and renders it.
4. Repeat until the objective is met or the run fails.

One action per tick, always — that's what makes the reasoning watchable and every
run reproducible.

## Two ways to author intelligence

**1. Visual rules (no code required)**
An ordered list of `WHEN <condition> → DO <action>` cards, evaluated top to
bottom like a flowchart. The first rule whose condition is true *and* whose action
is currently possible runs. Order is the logic — drag to reorder.

**2. Code mode (JavaScript)**
A controller class with a `decide(observation)` method, called once per tick,
returning one action. Instance fields persist between ticks, so it supports real
algorithms — pathfinding, stateful strategies, adaptive policies.

Both feed the same unchanged engine.

## The five worlds

| World | The problem | What it teaches |
|---|---|---|
| **Maze** | Navigate a robot to the exit through branching corridors and dead ends | Conditions, ordered decision flow, wall-following strategies |
| **Warehouse** | One autonomous picker collects rack tasks and delivers orders to packing | Scheduling work, using cargo capacity, and responding to arriving orders |
| **Supermarket** | A restocking bot keeps live convenience-store shelves above their reorder points | Urgency, replenishment scheduling, and demand-aware operations |
| **Finance — Payment Routing** | Route thousands of transactions across payment providers as they degrade, hit capacity, and go offline | Cost vs. reliability trade-offs, failover, retries, deadlines |
| **Parking** | Allocate bays to arriving vehicles with reservations, EV/accessibility needs, congestion, and gate outages | Resource allocation, prioritisation, fairness under pressure |

Same engine underneath. Adding a new industry is **content, not a rewrite**.

## What makes it different

- **You watch the algorithm behave** instead of reading its output.
- **Reasoning is visible** — a debug panel shows what was sensed, which rule
  fired, and why, on every tick.
- **Deterministic and seeded** — every candidate faces an identical run, so
  results are directly comparable. Essential for fair assessment.
- **Hidden test scenarios** — interview stages run 6–10 adversarial scenarios
  server-side after submission, so policies that only work on the happy path fail.
- **Scored on real outcomes** — cost, failures, timeouts, violations, throughput —
  not just pass/fail.
- **Grows with the user** — from arranging a few rule cards to writing full
  algorithms in code, on the same foundation.

## Difficulty is multi-dimensional

Not "easy / medium / hard." Each level is placed as
**Domain → Simulation → Tier → Grade**, and each grade adds a new *dimension of
decision complexity*: more entities, more constraints, time pressure, uncertainty,
competing objectives, memory, failure handling.

Users don't just solve harder problems — they learn to think in more sophisticated
ways.

## Who it's for

- **Learners** — understand algorithms by watching them run, not by imagining
  execution.
- **Educators** — teach computational thinking through visual, progressive
  challenges.
- **Technical interviews** — companies assess how candidates reason about
  realistic engineering problems. Shareable signed assignment links; hidden
  scenario suites; scored on adaptability and efficiency, not just correctness.
- **Hackathons & competitions** — participants compete to build the most effective
  intelligence for the same seeded scenario.
- **Engineering teams** — simulate their own operational problems for onboarding
  and internal training.

## Current state

A working platform, built and tested:

- **5 simulation worlds**, 22 published levels including 6 interview-grade stages
- **Visual rule builder** + **JavaScript Code mode**
- **Interview mode**: signed shareable assignment links, server-side hidden
  scenario evaluation with streamed results, aggregate scoring and diagnostics
- **Live simulation view** per world (a grid renderer for maze; an interactive
  order-processing floor for warehouse; a transaction-flow view for finance; a
  facility board for parking)
- **Progressive curriculum** with concept prerequisites and unlock gating
- **Tech**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Vitest (148 tests)

## Vision

To become the standard platform for designing, evaluating, and understanding
intelligent decision-making — bridging the gap between *learning* algorithms and
*applying* them to problems that look like real work.

---

# Website guide

## Suggested page structure

1. **Hero** — headline, one-line subhead, 90-second demo video, primary CTA
2. **The problem** — "Coding tests show you the answer. Not the thinking."
3. **How it works** — the Observe → Decide → Act loop, in three visuals
4. **The worlds** — five cards (Maze, Warehouse, Supermarket, Finance, Parking)
5. **Two ways to author** — visual rules vs. code, side by side
6. **For interviews** — hidden scenarios, deterministic runs, shareable links,
   outcome scoring
7. **Who it's for** — learners / educators / hiring teams / competitions
8. **CTA** — try a challenge, or book a demo

## Headline options

- *Watch how engineers actually think.*
- *Coding tests show you the answer. We show you the reasoning.*
- *Build the intelligence behind real systems.*
- *Assessment that runs, not just compiles.*

## Subhead options

- *Candidates author the decision logic for a live system — you watch it run,
  and see exactly how they reason under pressure.*
- *A simulation platform where you design an agent's decision-making, press run,
  and watch your algorithm behave.*

## Copy blocks you can lift

**On the problem**
> Every coding test tells you whether someone got the right answer. None of them
> show you how they think — how they break a system down, what they prioritise,
> or what they do when conditions change.

**On the principle**
> The engine executes intelligence — it never creates it. It owns the world and
> keeps score, but every decision is yours. Success depends entirely on the
> quality of the logic you design.

**On fairness (for hiring teams)**
> Every candidate faces the identical seeded scenario, so results are directly
> comparable. After submission, hidden adversarial scenarios run server-side —
> so a policy that only works on the happy path doesn't pass.

**On the finance world**
> You're not building a bank app. You're building the routing brain that decides,
> for each of thousands of transactions, which provider handles it — while
> providers degrade, saturate, and go offline mid-run.

## Tone

Confident, concrete, technical-but-plain. Lead with the problem, not the
architecture. Never mention internal terms (world modules, tick loops, engine
seams) in marketing copy — they mean nothing to a buyer.

## Visual direction

The product itself is monochrome and dense — the marketing site should be the
opposite: generous whitespace, one big product visual per section, and the
simulation doing the talking. **Show the running simulation early and often.**
Motion (a looping clip of the payment queue draining, or a robot solving a maze)
outperforms any static screenshot.
