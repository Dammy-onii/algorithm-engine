# First-Glance Studio UX Proposal

## Implementation status

The core clarity work described here was implemented on 2026-07-31:

- the complete Guide remains available on demand, but no longer opens
  automatically;
- a dismissible three-step coach appears inside the real workspace;
- the authoring top level is now **Policy / Code / Reference**;
- Policy keeps dedicated **Rules / Conditions / Functions** views, with States
  and Memory under **Advanced**;
- the editor-bottom Apply & Run button was removed; the sticky workspace header
  owns the primary action;
- the Run panel avoids repeating Apply & Run / Submit instructions;
- small screens use separate **Build / Run** workspaces;
- Task Progress and Policy Constraints now share one pass-contract surface;
- Debug displays the selected WHEN expression, action-safety result, and a
  plain-language “Why this action?” explanation;
- rule-condition and Code-fact vocabularies are searchable, grouped, and
  height-bounded.

The remaining Phase 2 enhancement is per-atom true/false evaluation for every
skipped rule and direct links from a failed contract row to the responsible
rule or runtime event.

## The problem to solve

The platform is not confusing because it lacks instructions. It is confusing
because several valid concepts compete for attention before the user has a
mental model.

On first open, the current challenge workspace can introduce:

- a formerly automatic full-screen multi-step guide;
- a problem brief and scenario;
- Visual Policy versus Code Controller;
- the former seven equal-weight layer tabs;
- the former duplicate Apply & Run actions;
- a simulation, task progress, policy constraints, results, and debug trace;
- an additional Submit action in interview stages.

Each part is useful, but presenting their labels at nearly equal visual weight
makes the user decide what the product is before they can solve the problem.

The first screen should answer only three questions:

1. **What am I trying to achieve?**
2. **What can I change?**
3. **What happened when I ran it?**

## Keep the two work surfaces

The independently scrolling desktop panels are useful and should remain.
Rules can become long, while the simulation must remain observable. Putting
both into one vertical document would force users to scroll away from either
their policy or the system they are debugging.

The improvement should come from hierarchy inside those panels, not from
merging them.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Problem 21 · one-sentence mission        Visual Policy   Run  Submit │
├──────────────────────────────────┬───────────────────────────────────┤
│ BUILD THE DECISION               │ WATCH THE SYSTEM                  │
│                                  │                                   │
│ Compact problem contract         │ Live simulation / operations view │
│                                  │                                   │
│ WHEN …  DO …                     │ Current decision                   │
│ WHEN …  DO …                     │ Task result                        │
│                                  │                                   │
│ + Add rule                       │ Debug details ▾                    │
│ Advanced building blocks ▾       │ Policy constraints ▾              │
└──────────────────────────────────┴───────────────────────────────────┘
```

## Recommended first-open hierarchy

### 1. Replace the automatic full-screen guide

Do not interrupt the first visit with the complete walkthrough. Start with the
actual challenge and show three small contextual callouts:

- **Mission** beside the one-sentence objective;
- **Build here** beside the first rule;
- **Run and inspect here** beside Apply & Run.

After the first run, point to the triggered rule and result. Keep the complete
Guide available from the header for users who request it.

This teaches the workflow in context and avoids making users memorize an
interface they have not used.

### 2. Make the policy the obvious default

The first editor view should contain the complete problem statement followed by
a clear scroll cue and the ordered WHEN/DO rules. The active controller should
remain visible as a small status control, but it should not read like a second
task.

Use three primary destinations:

- **Policy** — ordered rules and folders;
- **Code** — the alternative code controller;
- **Reference** — inputs/facts, available actions, operators, and examples.

Conditions and Functions remain dedicated Policy subviews because they teach
the available vocabulary. States and Memory live under **Advanced**. This
reduces initial labels without removing technical depth.

### 3. Use user-facing names before engine names

Introduce engine terminology only after the plain-language concept:

| Current concept | First label | Supporting label |
|---|---|---|
| Facts | Inputs you can read | Facts |
| Functions/actions | Outputs you can return | Actions and functions |
| Derived conditions | Reusable checks | Conditions |
| States | Operating modes | States |
| Memory | Values your policy remembers | Memory |

The engine names can remain in documentation and advanced references.

### 4. Use one primary run action

Keep one visually dominant **Apply & Run** action in the sticky workspace
header. The editor-bottom action should either be removed or become a compact
sticky shortcut only when the main header is outside the viewport.

Interview execution details belong in the interview guidance and submission
result flow, not as a repeated notice inside the simulation panel.

### 5. Make debugging causal

The most useful feedback is not a large fact dump. After every tick, show:

- the rule that was selected;
- the WHEN expression and which parts were true or false;
- the returned action;
- whether the environment accepted or rejected it;
- the resulting state change.

Keep the full domain-fact list, memory, penalty audit, and raw decision trace in
collapsed diagnostic sections. A user should see the cause first and the
complete evidence only when needed.

### 6. Present objectives as a contract, not another instruction list

Before a run, show a compact **Pass when** summary with the required outcomes.
During a run, show live values next to those requirements. After a run, preserve
the same rows and change only their status.

Example:

```text
Timeouts       1 / maximum 2       Pass
Overloads      0 / maximum 0       Pass
Penalty        124.50 / under 100  Fail
```

This prevents Task Progress, Policy Constraints, Results, and interview
guardrails from feeling like separate grading systems.

## Responsive behavior

Do not stack a long editor above a long simulation on smaller screens. Use two
top-level tabs:

- **Build**
- **Run**

Keep the main header sticky so Apply & Run remains available. When running, the
Run tab receives a live-status dot but does not switch automatically and
interrupt editing.

## Suggested implementation order

### Phase 1 — reduce initial confusion

1. ✅ Replace the automatic modal with contextual first-run callouts.
2. ✅ Reduce the seven primary layer tabs to Policy, Code, and Reference.
3. ✅ Remove the duplicate visual emphasis from the second Apply & Run button.
4. ✅ Keep execution-scope guidance out of the already busy Run panel.

### Phase 2 — improve understanding after a run

1. ✅ Add a causal “why this action?” trace for the selected branch and action
   safety result.
2. ✅ Merge the visible objective presentation into one persistent contract.
3. Link failed constraints directly to the relevant fact, rule, or penalty
   event.

### Phase 3 — support expert workflows

1. Add keyboard commands and command search.
2. Allow pinning selected facts beside the simulation.
3. Let users save reusable policy/function templates.
4. Add a compact run-history comparison for performance tuning.

## What not to do

- Do not copy a text-code editor layout wholesale; this product needs to expose
  a changing environment and a decision trace.
- Do not merge the policy and simulation into one long scrolling page.
- Do not remove advanced layers; progressively disclose them.
- Do not add more introductory prose to solve an information-hierarchy problem.
- Do not hide the difference between a visible run and an interview submission.
