# Sharing Interview Stages

## Current models

Interview sharing supports one challenge or an ordered set of published
challenges from one world through the same signed assignment system. Neither
mode copies challenge or hidden-case content.

```text
/i/[assignmentId] ──verify token──┐
                                  ├─► ordered ChallengeData references
POST /api/interview/assignments ──┘

/i/[assignmentId]/[challengeId] ───── selected assignment problem

Each ChallengeData
  ├── worldKey ─────────────────────── visible Apply & Run case
  └── interviewEvaluation?.suiteId ─── server-only Submit cases, when authored
```

The standard challenge workspace contains **Share interview**. It constructs the
assignment through `POST /api/interview/assignments`, attempts to copy the
resulting absolute `/i/[assignmentId]` URL, and always displays it in a
selectable field. A single challenge is simply a one-selection assignment
(plus a required interview tutorial where that world's ordering contract
requires one). The interview workspace offers the same control as **Copy
link**. A recipient can author and run the visible stage, then submit the same
compiled visual policy to the challenge's existing hidden suite.

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

Opening `/i/[assignmentId]` renders an interview-only directory. Its main
column lists the assigned challenge cards; its sidebar contains only interview
details, evaluation coverage, link access, and navigation for the assigned
problems. It does not expose normal world filters, curriculum details, Lab, or
unrelated challenges.

Selecting a card opens
`/i/[assignmentId]/[challengeId]`. The selected problem keeps the same Studio
frame, two-panel workspace, header placement, and problem-drawer interaction as
a normal challenge. Its **Interview problems** drawer substitutes interview
data for catalogue data: it shows the current position, link access, evaluation
coverage, submission contract, and only the problems included in the signed
assignment. It does not show unrelated world levels, normal curriculum status,
or world search. Old links using `?problem=2` redirect to the equivalent nested
problem route.

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

Token version 4 is the current global link generation. Versions 1–3 have been
retired by global link resets and are intentionally rejected by the resolver.

The token contains no problem statement, visible scenario, brain, hidden case
ID, fixture input, score diagnostic, or unpublished guardrail. There is no
assignment JSON file and no database record to drift from the challenge source.

Set `INTERVIEW_LINK_SECRET` to a long random secret in a deployed environment.
Local development uses a deterministic fallback so links survive dev-server
restarts. Changing the configured secret invalidates previously generated
multi-problem links.

### Link lifetime

The current compact assignment token contains no creation time or expiry time.
It therefore has **no scheduled expiry**. A link remains valid until one of the
following happens:

- `INTERVIEW_LINK_SECRET` changes;
- a referenced challenge is removed or its world/number reference changes;
- support for that token version is deliberately removed.

Only version-4 tokens are currently supported. Adding a company-defined deadline
later requires either an expiry timestamp inside a newly versioned signed token
or a persisted assignment record that the server can revoke.

## Validation

`/interview/[challengeId]` is a revoked legacy route and always returns the
application 404 page. Predictable challenge-ID links could not participate in a
global revocation, so new single-problem sharing also uses signed `/i/...`
assignments.

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

- revoked legacy route: `app/interview/[challengeId]/page.tsx`
- compact assignment route: `app/i/[assignmentId]/page.tsx`
- selected assignment problem route:
  `app/i/[assignmentId]/[challengeId]/page.tsx`
- interview-only directory:
  `features/interview/pages/InterviewAssignmentDirectoryPage.tsx`
- assignment creation route: `app/api/interview/assignments/route.ts`
- reusable ordering policy: `lib/interview/assignmentOrder.ts`
- selection validation: `lib/interview/assignment.ts`
- server-only token signing: `lib/interview/server/assignmentToken.ts`
- world-page selection UI:
  `features/catalogue/components/InterviewAssignmentBuilder.tsx`
- workspace mode: `features/studio/pages/StudioPage.tsx`
- interview-only workspace drawer:
  `features/studio/components/InterviewProblemDrawer.tsx`
- generated-link control:
  `features/studio/components/ShareInterviewLink.tsx`
- challenge registry: `lib/content/registry.ts`
- submit route: `app/api/interview/submit/route.ts`
- route/reference tests:
  `lib/interview/__tests__/interviewStages.test.tsx` and
  `lib/interview/__tests__/interviewAssignments.test.tsx`
