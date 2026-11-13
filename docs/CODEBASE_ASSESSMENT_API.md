# Codebase Assessments — API, Storage and Security

Source: `app/api/assessments/`, `app/api/review/`, `lib/assessment/server/`,
`lib/assessment/storage/`.

## Links and access

There are no accounts in v1. Access is by **capability link**:
`<assessmentId>.<signature>`, an HMAC-SHA256 truncated to 10 bytes, keyed by
`INTERVIEW_LINK_SECRET` (the same secret as simulation interview links; a built-in
development default is used when unset, so **set it in production**).

| Link | Path | Grants |
|---|---|---|
| Candidate | `/a/<token>` | Start or resume that one assessment; receive the starter files |
| Review | `/review/<token>` | Read every submission of that assessment and save reviews |

The signature covers a purpose prefix, so a candidate token is rejected as a review
token and the reverse. An invalid token always returns **404** (no hint whether
the assessment exists). The assessment id is random (12 bytes). Tokens cannot be
revoked individually; rotating the secret invalidates all of them.

## Routes

| Method and path | Token | Body | Result |
|---|---|---|---|
| `POST /api/assessments` | none | assessment fields | `{ id, candidatePath, reviewPath }` |
| `POST /api/assessments/<token>/sessions` | candidate | `{ name, email }` to start, or `{ sessionId }` to resume | session view (`sessionId`, `startedAt`, `deadline`, `files`, `resumed`) |
| `PUT /api/assessments/<token>/sessions/<sessionId>` | candidate | `{ files, reason: "autosave" \| "run" }` | `{ deadline }` |
| `POST /api/assessments/<token>/sessions/<sessionId>/submit` | candidate | `{ files }` | `{ submittedAt, late }` |
| `PUT /api/review/<token>/<sessionId>` | review | `{ scores, notes, recommendation }` | the saved review |

Errors are `{ error, code }` with the status in the table below. Bodies over about
3.5 MB are refused.

| Code | Status | Meaning |
|---|---|---|
| `invalid` | 400 | Validation failed (message says what) |
| `not_found` | 404 | Bad link, assessment or session |
| `link_used` | 409 | The link already has a session and the caller does not hold it |
| `already_submitted` | 409 | The session is finished |
| `expired` | 410 | Autosave after the deadline plus grace |

Reviewer pages read the store on the server (`force-dynamic`); they have no API.

## Authoring payload

`POST /api/assessments`:

```jsonc
{
  "title": "Fix the cart total",            // 3–120 chars
  "scenario": "…",                           // 10–8000 chars
  "runtimeId": "react-js",                   // default react-js
  "files": { "/App.js": "…" },               // at least one; includes visible tests
  "hiddenTests": { "/utils/x.hidden.test.js": "…" },   // optional
  "rubric": [{ "label": "…", "description": "…", "maxScore": 5 }],   // optional, ≤ 10
  "timeLimitMinutes": 45,                    // optional, 5–480
  "aiPolicy": "not_allowed"                  // or "allowed"
}
```

File paths are normalised to absolute forward-slash paths. `..`, backslashes and
null characters are rejected. Limits: 200 files, 200 KB each, 1.5 MB total.

## Session rules

Enforced in `lib/assessment/server/service.ts`:

- **One attempt per link.** The first `start` creates the only session. Later
  `start` calls succeed only with that session's id (resume). Anyone else gets
  `link_used`; after submit, even the owner gets `already_submitted`.
- **Resume** relies on the session id the browser keeps in local storage
  (`ctrl-assessment-session:<token>`).
- **Time limit.** `deadline = startedAt + limit`. Autosave is accepted until
  `deadline + 60 s` (`EXPIRY_GRACE_MS`), then returns `expired`. The final submit
  is always accepted once, and flagged `late` if it arrives after the grace window.
  The workspace auto-submits when the countdown reaches zero.
- **Server clock only.** The deadline and timestamps come from the server; the
  client timer is a display.
- **Candidates never receive** hidden tests or review data. `toPublicAssessment`
  strips `hiddenTests`; `candidateView` exposes only id, times, status and files.

## Storage

```ts
interface AssessmentStore {
  createAssessment(a: Assessment): Promise<void>;
  getAssessment(id: string): Promise<Assessment | undefined>;
  saveSession(s: Session): Promise<void>;               // insert or replace
  getSession(assessmentId: string, sessionId: string): Promise<Session | undefined>;
  listSessions(assessmentId: string): Promise<Session[]>;
}
```

| `ASSESSMENT_STORE` | Behaviour |
|---|---|
| `file` | JSON on disk under `./.data/assessments` (override with `ASSESSMENT_DATA_DIR`). Default in development; `.data/` is git-ignored |
| `memory` | Process memory; lost on restart |
| unset in production | Routes fail with 503 until configured. Serverless disks and memory are ephemeral, so there is no safe default |

To add a database (Supabase, Postgres, …), implement `AssessmentStore` and return
it from `getAssessmentStore()` in `storage/index.ts`. The service layer and routes
need no change. Note that `saveSession` replaces the whole session (read-modify-write);
concurrent writers for one session can race, which a real database should handle
with row updates or version checks.

## Hidden-test runner

Hidden tests must never execute in the candidate's browser, where they could be
read. The extension point is `HiddenTestRunner`
(`server/hiddenTests.ts`):

```ts
interface HiddenTestRunner {
  run(assessment: Assessment, submittedFiles: FileMap): Promise<HiddenTestResult>;
}
// HiddenTestResult: { status: "not_configured" | "pending" | "passed" | "failed" | "error"; passed?; total?; detail? }
```

It is called once on submit; its result is stored and shown to reviewers. A runner
that throws becomes `status: "error"` and the submission is still saved.

v1 ships `notConfiguredRunner`. A real runner must execute **untrusted code**, which
Node's `vm` module cannot do safely, so it needs an isolated host (a container
sandbox service or a dedicated runner with no network or secrets, CPU, memory and
time limits). Because Netlify functions are not such a boundary, expect this to be
a separate service called from `submitSession`. Until then reviewers run the hidden
tests themselves; the detail page prints the files.

## Environment

| Variable | Purpose |
|---|---|
| `INTERVIEW_LINK_SECRET` | Signs candidate and review links. Required in production |
| `ASSESSMENT_STORE` | `file` or `memory`. Required in production until a database exists |
| `ASSESSMENT_DATA_DIR` | Optional data folder for the `file` store |

## Tests

`npx vitest run lib/assessment` covers path and upload rules, diff and replay,
link signing and purpose separation, validation, one-attempt and resume rules,
snapshot recording, time-limit and late handling, runner failure handling and
review validation.
