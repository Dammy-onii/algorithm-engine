# Sharing Interview Stages

## Current models

Interview sharing supports one scored interview challenge or an ordered set of
any published challenges from one world. Neither mode copies challenge or
hidden-case content.

```text
/interview/[challengeId] ───────────── one interview challenge

/i/[assignmentId] ──verify token──┐
                                  ├─► ordered ChallengeData references
POST /api/interview/assignments ──┘

Each ChallengeData
  ├── worldKey ─────────────────────── visible Apply & Run case
  └── interviewEvaluation?.suiteId ─── server-only Submit cases, when authored
```

Examples:

```text
/interview/finance-interview-routing
/interview/finance-peak-hour-switch
/interview/finance-production-orchestrator
/interview/parking-interview-controller
/interview/parking-interview-operations
/interview/parking-interview-orchestrator
```

The standard challenge workspace contains **Share interview**. It constructs the
absolute `/interview/[challengeId]` URL, attempts to copy it, and always displays
the generated URL in a selectable field. The interview workspace offers the
same control as **Copy link**. A recipient can author and run the visible stage,
then submit the same compiled visual policy to the challenge's existing hidden
suite.

Every Maze, Warehouse, Finance, and Parking world page contains an **Interview
assignment** selector listing all published levels in that world. The
interviewer selects a series and creates a compact `/i/[assignmentId]` link.

Finance and Parking currently mark one interview tutorial as required. That
stage is selected permanently and automatically inserted if omitted from an API
request. Maze and Warehouse have no required interview-stage marker, so any of
their published levels may form the assignment. The normalized order is:

1. tutorial;
2. ascending difficulty;
3. ascending taxonomy grade;
4. ascending authored challenge number.

The shared assignment notice shows `Problem n of total` and links to every
problem, including ordinary levels without a hidden suite. Its query string
(`?problem=2`) selects only the current position; it does not redefine the
assignment.

An ordinary assigned level supports its visible **Apply & Run** objectives but
does not display **Submit**, because it has no `interviewEvaluation` contract.
Interview-grade Finance and Parking levels continue to expose their server-only
hidden submission suites.

The shared interview header intentionally omits the catalogue back control,
curriculum navigation, and the Lab switch so the candidate remains inside the
assigned workspace.

## Short assignment IDs

The short assignment ID is a compact stateless token. Version 2 contains a
format version, stable world code, and selected challenge numbers. Including
the world is required because challenge numbers are unique within a world, not
globally: Maze and Warehouse both publish a level numbered 6. A truncated HMAC
signature prevents the sequence from being modified without detection. The
server resolves the world/number references back to the current registry.

The resolver remains compatible with version-1 links previously generated for
interview-enabled Finance and Parking stages.

The token contains no problem statement, visible scenario, brain, hidden case
ID, fixture input, score diagnostic, or unpublished guardrail. There is no
assignment JSON file and no database record to drift from the challenge source.

Set `INTERVIEW_LINK_SECRET` to a long random secret in a deployed environment.
Local development uses a deterministic fallback so links survive dev-server
restarts. Changing the configured secret invalidates previously generated
multi-problem links.

## Validation

`/interview/[challengeId]` returns the application 404 page when the id does not
exist or the challenge has no `interviewEvaluation`. Ordinary tutorials cannot
therefore be presented as scored interviews without an evaluation contract.

`/i/[assignmentId]` verifies the signature, token structure, referenced world
and challenge numbers, one-world constraint, optional required tutorial
inclusion, and canonical order. A malformed, modified, or stale token returns
the application 404 page.

## What sharing includes

- one or more existing visible worlds for Apply & Run practice;
- the complete hidden set referenced by each selected interview-grade stage's
  suite id;
- streamed case progress after explicit Submit on those scored stages;
- case metrics, diagnostics, aggregate score, and pass/fail where a hidden suite
  exists;
- a separate locally persisted policy for every problem and assignment.

## Current limits

The stateless assignment token intentionally does not provide:

- a company-specific subset of hidden cases;
- custom branding or instructions;
- invite revocation;
- server-enforced time or attempt limits;
- candidate identity, submission history, or an interviewer dashboard.

Those features require a persisted server-side assignment/session record. Such a
record should still reference challenge IDs and optional case IDs; it should
never duplicate challenge or fixture definitions.

## Implementation

- route: `app/interview/[challengeId]/page.tsx`
- compact assignment route: `app/i/[assignmentId]/page.tsx`
- assignment creation route: `app/api/interview/assignments/route.ts`
- reusable ordering policy: `lib/interview/assignmentOrder.ts`
- selection validation: `lib/interview/assignment.ts`
- server-only token signing: `lib/interview/server/assignmentToken.ts`
- world-page selection UI:
  `features/catalogue/components/InterviewAssignmentBuilder.tsx`
- workspace mode: `features/studio/pages/StudioPage.tsx`
- interview notice:
  `features/studio/components/InterviewStageNotice.tsx`
- generated-link control:
  `features/studio/components/ShareInterviewLink.tsx`
- challenge registry: `lib/content/registry.ts`
- submit route: `app/api/interview/submit/route.ts`
- route/reference tests:
  `lib/interview/__tests__/interviewStages.test.tsx` and
  `lib/interview/__tests__/interviewAssignments.test.tsx`
