import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { computeSessionStats } from "../stats";
import { filesAtSnapshot } from "../files";
import { reactExample } from "../runtime/examples";
import { createLinkToken, verifyLinkToken } from "../server/link";
import {
  createAssessment, saveProgress, saveReview, startSession, submitSession, toPublicAssessment, ServiceError,
  EXPIRY_GRACE_MS,
} from "../server/service";
import { setHiddenTestRunner, notConfiguredRunner } from "../server/hiddenTests";
import { MemoryAssessmentStore } from "../storage/memoryStore";

const example = reactExample();
const base = { title: "Fix the cart", scenario: example.scenario, files: example.files, hiddenTests: example.hiddenTests };

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("link tokens", () => {
  it("verifies its own kind and rejects tampering or the other kind", () => {
    const candidate = createLinkToken("candidate", "abc123XYZ");
    expect(verifyLinkToken("candidate", candidate)).toBe("abc123XYZ");
    expect(verifyLinkToken("review", candidate)).toBeUndefined();
    expect(verifyLinkToken("candidate", candidate.replace("abc", "abd"))).toBeUndefined();
    expect(verifyLinkToken("candidate", "nodot")).toBeUndefined();
  });
});

describe("assessment lifecycle", () => {
  let store: MemoryAssessmentStore;
  beforeEach(() => {
    store = new MemoryAssessmentStore();
    setHiddenTestRunner(notConfiguredRunner);
  });
  afterEach(() => vi.useRealTimers());

  it("validates authoring input", async () => {
    await expectCode(createAssessment(store, { ...base, title: "x" }), "invalid");
    await expectCode(createAssessment(store, { ...base, files: {} }), "invalid");
    await expectCode(createAssessment(store, { ...base, runtimeId: "cobol" }), "invalid");
    await expectCode(createAssessment(store, { ...base, timeLimitMinutes: 2 }), "invalid");
    await expectCode(createAssessment(store, { ...base, files: { "../x": "y" } }), "invalid");
  });

  it("never exposes hidden tests to candidates", async () => {
    const a = await createAssessment(store, base);
    const pub = toPublicAssessment(a);
    expect(pub).not.toHaveProperty("hiddenTests");
    expect(pub.hasHiddenTests).toBe(true);
    expect(JSON.stringify(pub)).not.toContain("hidden.test");
  });

  it("allows exactly one attempt per link and resumes only with the session id", async () => {
    const a = await createAssessment(store, { ...base, timeLimitMinutes: 60 });
    await expectCode(startSession(store, a.id, { name: "Ada", email: "nope" }), "invalid");
    const first = await startSession(store, a.id, { name: "Ada", email: "ada@example.com" });
    expect(first.resumed).toBe(false);
    expect(first.view.deadline).toBe(first.view.startedAt + 60 * 60_000);

    await expectCode(startSession(store, a.id, { name: "Eve", email: "eve@example.com" }), "link_used");
    const resumed = await startSession(store, a.id, { sessionId: first.view.sessionId });
    expect(resumed.resumed).toBe(true);
    await submitSession(store, a.id, first.view.sessionId, { files: a.files });
    await expectCode(startSession(store, a.id, { sessionId: first.view.sessionId }), "already_submitted");
    await expectCode(saveProgress(store, a.id, first.view.sessionId, { files: a.files }), "already_submitted");
  });

  it("records snapshots as diffs and counts runs", async () => {
    const a = await createAssessment(store, base);
    const { view } = await startSession(store, a.id, { name: "Ada", email: "ada@example.com" });
    const fixed = { ...a.files, "/utils/cart.js": a.files["/utils/cart.js"].replace("sum + item.price", "sum + item.price * item.quantity") };

    await saveProgress(store, a.id, view.sessionId, { files: a.files, reason: "autosave" }); // unchanged: no snapshot
    await saveProgress(store, a.id, view.sessionId, { files: fixed, reason: "autosave" });
    await saveProgress(store, a.id, view.sessionId, { files: fixed, reason: "run" }); // run is always recorded
    const done = await submitSession(store, a.id, view.sessionId, { files: fixed });

    expect(done.snapshots.map((s) => s.reason)).toEqual(["start", "autosave", "run", "submit"]);
    expect(Object.keys(done.snapshots[1].changes)).toEqual(["/utils/cart.js"]);
    expect(filesAtSnapshot(done.snapshots, 3)).toEqual(fixed);
    expect(done.files).toEqual(fixed);
    expect(done.hiddenTestResult?.status).toBe("not_configured");

    const stats = computeSessionStats(done, a);
    expect(stats.runCount).toBe(1);
    expect(stats.filesChanged).toBe(1);
    expect(stats.linesAdded).toBe(1);
    expect(stats.linesRemoved).toBe(1);
    expect(stats.snapshotCount).toBe(4);
  });

  it("enforces the time limit on autosave but accepts a late submit, flagged", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    const a = await createAssessment(store, { ...base, timeLimitMinutes: 30 });
    const { view } = await startSession(store, a.id, { name: "Ada", email: "ada@example.com" });

    vi.setSystemTime(new Date("2026-01-01T10:30:30Z")); // inside the grace window
    await saveProgress(store, a.id, view.sessionId, { files: a.files });
    vi.setSystemTime(Date.parse("2026-01-01T10:30:00Z") + EXPIRY_GRACE_MS + 1000);
    await expectCode(saveProgress(store, a.id, view.sessionId, { files: a.files }), "expired");
    const done = await submitSession(store, a.id, view.sessionId, { files: a.files });
    expect(done.late).toBe(true);
  });

  it("surfaces a failing hidden-test runner as an error result, not a lost submission", async () => {
    setHiddenTestRunner({ run: async () => { throw new Error("runner down"); } });
    const a = await createAssessment(store, base);
    const { view } = await startSession(store, a.id, { name: "Ada", email: "ada@example.com" });
    const done = await submitSession(store, a.id, view.sessionId, { files: a.files });
    expect(done.status).toBe("submitted");
    expect(done.hiddenTestResult).toEqual({ status: "error", detail: "runner down" });
  });

  it("validates reviews against the rubric", async () => {
    const a = await createAssessment(store, base);
    const { view } = await startSession(store, a.id, { name: "Ada", email: "ada@example.com" });
    await submitSession(store, a.id, view.sessionId, { files: a.files });
    const review = await saveReview(store, a.id, view.sessionId, {
      scores: { understanding: 4, correctness: "5" }, notes: "Solid", recommendation: "advance",
    });
    expect(review.scores).toEqual({ understanding: 4, correctness: 5 });
    expect(review.recommendation).toBe("advance");
    await expectCode(saveReview(store, a.id, view.sessionId, { scores: { quality: 9 } }), "invalid");
    await expect(saveReview(store, a.id, "missing", {})).rejects.toBeInstanceOf(ServiceError);
  });
});
