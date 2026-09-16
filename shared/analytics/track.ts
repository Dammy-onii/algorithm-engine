import clarity from "@microsoft/clarity";

/**
 * Thin wrapper over Microsoft Clarity's custom events + session tags, used to
 * understand how people move through the test/interview flow:
 *   opened → problem opened → run → pass/fail → submit → completed.
 *
 * Every call is guarded. Clarity only initialises in production (see Clarity.tsx),
 * so outside production — or when the script is blocked — window.clarity is absent
 * and the package methods throw. We swallow that, making tracking a safe no-op that
 * never affects the app or the person taking the test.
 */

type TagValue = string | number | boolean;

function safe(run: () => void): void {
  try {
    run();
  } catch {
    // Clarity not initialised (dev / blocked) — tracking is best-effort only.
  }
}

/** Fire a named Clarity custom event (filterable + funnel-able in the dashboard). */
export function trackEvent(name: string): void {
  safe(() => clarity.event(name));
}

/** Attach a session tag so replays and events can be segmented (world, difficulty…). */
export function trackTag(key: string, value: TagValue): void {
  safe(() => clarity.setTag(key, String(value)));
}

/** Everything known about the problem a person is currently working through. */
export interface TestContext {
  /** Pack / world id, e.g. "maze", "finance". */
  world: string;
  /** Challenge id, e.g. "straight-line". */
  challenge: string;
  /** Difficulty band: "example" | "easy" | "medium" | "hard". */
  difficulty: string;
  /** How they reached it. */
  mode: "interview" | "practice";
  /** Shared interview-link id, when the problem is part of an assignment. */
  assignmentId?: string;
}

function applyContext(ctx: TestContext): void {
  trackTag("world", ctx.world);
  trackTag("challenge", ctx.challenge);
  trackTag("difficulty", ctx.difficulty);
  trackTag("mode", ctx.mode);
  if (ctx.assignmentId) trackTag("assignment", ctx.assignmentId);
}

/**
 * The test-taking funnel. Each call tags the session with the current context (so
 * replays can be filtered by world / difficulty / assignment) and fires the matching
 * event. Names are stable so they can be charted as a funnel in Clarity.
 */
export const testTracking = {
  /** Landed on a shared interview link's problem list. */
  interviewOpened(assignmentId: string, world: string): void {
    trackTag("mode", "interview");
    trackTag("assignment", assignmentId);
    trackTag("world", world);
    trackEvent("test_interview_opened");
  },
  /** Opened a specific problem in the studio. */
  problemOpened(ctx: TestContext): void {
    applyContext(ctx);
    trackEvent("test_problem_opened");
  },
  /** Pressed Apply & Run to start a simulation. */
  runStarted(ctx: TestContext): void {
    applyContext(ctx);
    trackEvent("test_run_started");
  },
  /** A visible run finished — passed or failed its objectives. */
  runFinished(ctx: TestContext, passed: boolean): void {
    applyContext(ctx);
    trackEvent(passed ? "test_run_passed" : "test_run_failed");
  },
  /** Submitted an interview problem against the hidden suite. */
  interviewSubmitted(ctx: TestContext, passed: boolean): void {
    applyContext(ctx);
    trackEvent(passed ? "test_submitted_passed" : "test_submitted_failed");
  },
  /** A problem was solved (marked complete). */
  problemCompleted(ctx: TestContext): void {
    applyContext(ctx);
    trackEvent("test_problem_completed");
  },
};
