"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { BrainSource } from "@/lib/engine/simulation";
import type { VisualBrain } from "@/lib/authoring/types";
import type {
  InterviewScenarioResult,
  InterviewStreamEvent,
  InterviewSubmissionReport,
} from "@/lib/interview/types";
import type {
  InterviewDemoSuite,
  InterviewDemoWorkerRequest,
} from "@/lib/interview/demoTypes";
import type {
  ObjectiveResult,
  StepResult,
} from "@/lib/authoring/objectives";
import {
  challengePassed,
  evaluateObjectives,
  evaluateSteps,
  liveContext,
  metricsFromSim,
} from "@/lib/authoring/objectives";
import { compileBrain } from "@/lib/authoring/brainCompiler";
import { compileController } from "@/lib/authoring/controllerCompiler";
import { normalizeBrief } from "@/lib/authoring/challengeBrief";
import type { Concept } from "@/lib/curriculum/concepts";
import {
  conceptForChallenge,
  isChallengeUnlocked,
} from "@/lib/curriculum/concepts";
import {
  challengesInPack,
  findPack,
} from "@/lib/content/registry";
import { findChallenge } from "@/content/challenges";
import type { SimulationSession } from "@/features/engine/simulation/types";
import { createSimulationSession } from "@/features/engine/simulation/session";
import { simulationSpeedForWorld } from "@/features/engine/simulation/speed";
import { SimControls } from "@/features/engine/simulation/components/SimControls";
import {
  SimLegend,
  SimStage,
} from "@/features/engine/simulation/components/SimStage";
import { WorldRenderer } from "@/features/engine/simulation/components/renderers/WorldRenderer";
import { AuthoringPanel } from "@/features/engine/studio/components/AuthoringPanel";
import { ResultsPanel } from "@/features/engine/studio/components/ResultsPanel";
import { InterviewResultsPanel } from "@/features/engine/studio/components/InterviewResultsPanel";
import { ChallengeWalkthrough } from "@/features/engine/studio/components/ChallengeWalkthrough";
import {
  InterviewProblemDrawer,
  type InterviewAssignmentContext,
} from "@/features/engine/studio/components/InterviewProblemDrawer";
import { ShareInterviewLink } from "@/features/engine/studio/components/ShareInterviewLink";
import { TaskChecklist } from "@/features/engine/studio/components/TaskChecklist";
import { PolicyAuditPanel } from "@/features/engine/studio/components/PolicyAuditPanel";
import { FirstRunCoach } from "@/features/engine/studio/components/FirstRunCoach";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import {
  difficultyFor,
  type DifficultyBand,
} from "@/features/engine/catalogue/difficulty";
import {
  readCompletedChallenges,
  readStoredBrain,
  saveBrain,
  scaffoldBrainFor,
} from "@/features/engine/studio/persistence";
import { interviewAssignmentProblemPath } from "@/lib/interview/assignmentRoutes";
import { findWorld } from "@/lib/content/datasets";
import { testTracking, type TestContext } from "@/shared/analytics/track";

interface StudioPageProps {
  packId: string;
  challengeId: string;
  workspaceMode?: "challenge" | "interview";
  interviewAssignment?: InterviewAssignmentContext;
}

async function streamVisualPolicySubmission(
  challengeId: string,
  brain: BrainSource,
  receiveEvent: (
    event: InterviewStreamEvent,
  ) => InterviewSubmissionReport | undefined,
): Promise<InterviewSubmissionReport> {
  const response = await fetch("/api/interview/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId, brain }),
  });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Server evaluation failed.");
  }
  if (!response.body) {
    throw new Error("The server evaluator did not return a result stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalReport: InterviewSubmissionReport | undefined;

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const completed = receiveEvent(
        JSON.parse(line) as InterviewStreamEvent,
      );
      if (completed) finalReport = completed;
    }
    if (done) break;
  }
  if (buffer.trim()) {
    const completed = receiveEvent(
      JSON.parse(buffer) as InterviewStreamEvent,
    );
    if (completed) finalReport = completed;
  }
  if (!finalReport) {
    throw new Error("The server evaluator ended without a final report.");
  }
  return finalReport;
}

async function runBrowserCodeSubmission(
  challengeId: string,
  source: string,
  receiveEvent: (
    event: InterviewStreamEvent,
  ) => InterviewSubmissionReport | undefined,
): Promise<InterviewSubmissionReport> {
  if (!source.trim()) {
    throw new Error("Write a Code Controller before submitting your solution.");
  }

  const response = await fetch("/api/interview/demo-suite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId }),
  });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "The demo scenarios could not be loaded.");
  }
  const suite = (await response.json()) as InterviewDemoSuite;
  if (suite.mode !== "browser-demo" || !Array.isArray(suite.scenarios)) {
    throw new Error("The demo evaluator returned an invalid scenario suite.");
  }

  // Next 16.2's Turbopack development worker output can concatenate its
  // source-map comment and worker bootstrap without a separating newline,
  // which makes the generated worker invalid JavaScript. Keep Demo mode usable
  // under `next dev` by evaluating one scenario at a time on the browser page
  // and yielding between cases. Production keeps the isolated Web Worker path.
  if (process.env.NODE_ENV === "development") {
    return runDevelopmentCodeSubmission(source, suite, receiveEvent);
  }

  const worker = new Worker(
    new URL("../workers/interviewCodeEvaluator.worker.ts", import.meta.url),
    { type: "module", name: "interview-code-evaluator" },
  );

  try {
    return await new Promise<InterviewSubmissionReport>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(
          new Error(
            "Browser evaluation exceeded two minutes. Check the controller for a loop or expensive per-tick work.",
          ),
        );
      }, 120_000);

      const finish = (
        callback: () => void,
      ) => {
        window.clearTimeout(timeout);
        callback();
      };

      worker.onmessage = (message: MessageEvent<InterviewStreamEvent>) => {
        try {
          const finalReport = receiveEvent(message.data);
          if (finalReport) finish(() => resolve(finalReport));
        } catch (error) {
          finish(() =>
            reject(error instanceof Error ? error : new Error(String(error))),
          );
        }
      };
      worker.onerror = (event) => {
        finish(() =>
          reject(
            new Error(
              event.message || "The browser Code evaluator stopped unexpectedly.",
            ),
          ),
        );
      };

      const request: InterviewDemoWorkerRequest = { source, suite };
      worker.postMessage(request);
    });
  } finally {
    worker.terminate();
  }
}

async function runDevelopmentCodeSubmission(
  source: string,
  suite: InterviewDemoSuite,
  receiveEvent: (
    event: InterviewStreamEvent,
  ) => InterviewSubmissionReport | undefined,
): Promise<InterviewSubmissionReport> {
  const {
    evaluateFinanceScenario,
    evaluateParkingScenario,
    summarizeFinanceSubmission,
    summarizeParkingSubmission,
  } = await import("@/lib/interview/evaluation/scenarioEvaluation");
  const controllerBrain: BrainSource = {
    goals: { goals: [{ id: "controller", priority: 1 }] },
    states: { initial: "controller", states: [{ id: "controller" }] },
    rules: { rules: [] },
    functions: { functions: [{ id: "hold", action: "wait" }] },
    memory: {},
  };
  const results: InterviewScenarioResult[] = [];

  receiveEvent({
    type: "suite-start",
    suiteId: suite.suiteId,
    scenarioCount: suite.scenarios.length,
    passingScore: suite.passingScore,
  });

  if (suite.pack === "finance") {
    for (let index = 0; index < suite.scenarios.length; index += 1) {
      const scenario = suite.scenarios[index];
      receiveEvent({
        type: "scenario-start",
        index,
        scenarioCount: suite.scenarios.length,
        label: scenario.label,
      });
      // Let React paint the active-case state before synchronous simulation.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      const result = evaluateFinanceScenario(
        scenario,
        controllerBrain,
        compileController(source),
      );
      results.push(result);
      receiveEvent({ type: "scenario-result", index, scenario: result });
    }
    const report = summarizeFinanceSubmission(
      suite.suiteId,
      results,
      suite.passingScore,
    );
    receiveEvent({ type: "suite-complete", report });
    return report;
  }

  for (let index = 0; index < suite.scenarios.length; index += 1) {
    const scenario = suite.scenarios[index];
    receiveEvent({
      type: "scenario-start",
      index,
      scenarioCount: suite.scenarios.length,
      label: scenario.label,
    });
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    const result = evaluateParkingScenario(
      scenario,
      controllerBrain,
      compileController(source),
    );
    results.push(result);
    receiveEvent({ type: "scenario-result", index, scenario: result });
  }
  const report = summarizeParkingSubmission(
    suite.suiteId,
    results,
    suite.passingScore,
  );
  receiveEvent({ type: "suite-complete", report });
  return report;
}

/** Complete interactive UI and state for `/[pack]/[challenge]`. */
export function StudioPage({
  packId,
  challengeId,
  workspaceMode = "challenge",
  interviewAssignment,
}: StudioPageProps) {
  const router = useRouter();
  const pack = findPack(packId);
  const challenge = findChallenge(challengeId);
  const challenges = challengesInPack(packId);
  const worldKind = findWorld(challenge.worldKey).source.world.kind ?? "maze";
  const speedProfile = simulationSpeedForWorld(worldKind);
  const normalBrainStorageId = challenge.scaffoldVersion
    ? `${challengeId}-scaffold-v${challenge.scaffoldVersion}`
    : challengeId;
  const brainStorageId = challenge.interviewEvaluation
    ? `interview-empty-v1-${interviewAssignment ? `${interviewAssignment.id}-` : ""}${challengeId}`
    : workspaceMode === "interview" && interviewAssignment
      ? `interview-assignment-v1-${interviewAssignment.id}-${challengeId}`
    : normalBrainStorageId;

  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(speedProfile.initial);
  const [brain, setBrain] = useState<VisualBrain>(() =>
    scaffoldBrainFor(challengeId),
  );
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SimulationSession | null>(null);
  const [objectiveResults, setObjectiveResults] =
    useState<ObjectiveResult[] | null>(null);
  const [justLearned, setJustLearned] = useState<Concept | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [mobileWorkspace, setMobileWorkspace] = useState<"build" | "run">(
    "build",
  );
  const [problemListOpen, setProblemListOpen] = useState(false);
  const [problemSearch, setProblemSearch] = useState("");
  const [submissionReport, setSubmissionReport] =
    useState<InterviewSubmissionReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionScenarios, setSubmissionScenarios] = useState<
    InterviewScenarioResult[]
  >([]);
  const [activeHiddenCase, setActiveHiddenCase] = useState<string | null>(null);
  const [hiddenCasesCompleted, setHiddenCasesCompleted] = useState(0);
  const isInterviewWorkspace = workspaceMode === "interview";
  const assignmentNextPath =
    interviewAssignment &&
    interviewAssignment.currentIndex < interviewAssignment.challengeIds.length - 1
      ? interviewAssignmentProblemPath(
          interviewAssignment.id,
          interviewAssignment.challengeIds[
            interviewAssignment.currentIndex + 1
          ],
        )
      : undefined;

  // Analytics context for the current problem — tags every test event with the
  // world, difficulty, mode, and (for shared links) the assignment id.
  const testContext = useMemo<TestContext>(
    () => ({
      world: packId,
      challenge: challengeId,
      difficulty: difficultyFor(challenge),
      mode: isInterviewWorkspace ? "interview" : "practice",
      assignmentId: interviewAssignment?.id,
    }),
    [packId, challengeId, challenge, isInterviewWorkspace, interviewAssignment?.id],
  );

  useEffect(() => {
    const stored = readStoredBrain(challengeId, brainStorageId);
    const completed = readCompletedChallenges();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setBrain(stored);
    if (completed.size) setCompletedIds(completed);
  }, [brainStorageId, challengeId]);

  // Record that this problem was opened (once per problem).
  useEffect(() => {
    testTracking.problemOpened(testContext);
  }, [testContext]);

  const previewSession = useMemo(() => {
    const previewChallenge = findChallenge(challengeId);
    const result = createSimulationSession(
      previewChallenge.worldKey,
      previewChallenge.scaffoldBrain as BrainSource,
    );
    return "session" in result ? result.session : null;
  }, [challengeId]);

  const finishWalkthrough = () => {
    setWalkthroughOpen(false);
    try {
      localStorage.setItem("ae-challenge-walkthrough-v2", "complete");
    } catch {
      // Non-persistent dismissal is still valid.
    }
  };

  const onBrainChange = (
    next: VisualBrain | ((current: VisualBrain) => VisualBrain),
  ) => {
    setBrain((current) => {
      const updated = typeof next === "function" ? next(current) : next;
      saveBrain(brainStorageId, updated);
      return updated;
    });
  };

  const onRun = () => {
    setRunning(false);
    let brainSource: BrainSource;
    try {
      brainSource = compileBrain(brain);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
      return;
    }

    let controller;
    try {
      controller =
        brain.controllerMode === "code"
          ? compileController(brain.controllerCode ?? "")
          : undefined;
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
      return;
    }

    const result = createSimulationSession(challenge.worldKey, brainSource, {
      controller,
    });
    if ("error" in result) {
      setError(result.error);
      return;
    }

    setError(null);
    setObjectiveResults(null);
    setSubmissionReport(null);
    setSubmissionError(null);
    setSubmissionScenarios([]);
    setActiveHiddenCase(null);
    setHiddenCasesCompleted(0);
    setJustLearned(null);
    setSession(result.session);
    setRunning(true);
    testTracking.runStarted(testContext);
  };

  const finishVisibleRun = useCallback((finishedSession: SimulationSession) => {
    const finishedChallenge = findChallenge(challengeId);
    const metrics = metricsFromSim(finishedSession.sim, brain);
    const results = evaluateObjectives(
      finishedChallenge.objectives ?? [],
      metrics,
    );
    setObjectiveResults(results);
    const didPass = challengePassed(results);
    testTracking.runFinished(testContext, didPass);
    if (didPass) {
      if (!finishedChallenge.interviewEvaluation) {
        try {
          localStorage.setItem(`ae-complete-${challengeId}`, "true");
        } catch {
          // Completion still applies to the current session.
        }
        if (!completedIds.has(challengeId)) {
          setJustLearned(conceptForChallenge(challengeId) ?? null);
        }
        setCompletedIds((current) => new Set(current).add(challengeId));
        // Non-interview problems are completed the moment the visible run passes.
        testTracking.problemCompleted(testContext);
      }
      setAttempts(0);
    } else {
      setAttempts((current) => current + 1);
    }
  }, [brain, challengeId, completedIds, testContext]);

  useEffect(() => {
    if (!running || !session) return;
    const interval = setInterval(() => {
      const next = session.sim.tick();
      setSession({ sim: session.sim, step: next });
      if (!session.sim.isDone) return;

      setRunning(false);
      finishVisibleRun(session);
    }, 1000 / speed);
    return () => clearInterval(interval);
  }, [
    running,
    session,
    speed,
    finishVisibleRun,
  ]);

  const doStep = () => {
    if (!session) return;
    const next = session.sim.tick();
    const steppedSession = { sim: session.sim, step: next };
    setSession(steppedSession);
    if (session.sim.isDone && !objectiveResults) {
      finishVisibleRun(steppedSession);
    }
  };

  const doReset = () => {
    setRunning(false);
    onRun();
  };

  const onSubmitInterview = async () => {
    if (!challenge.interviewEvaluation) return;

    setSubmitting(true);
    setSubmissionError(null);
    setSubmissionReport(null);
    setSubmissionScenarios([]);
    setActiveHiddenCase(null);
    setHiddenCasesCompleted(0);
    try {
      const receiveEvent = (
        event: InterviewStreamEvent,
      ): InterviewSubmissionReport | undefined => {
        if (event.type === "suite-start") {
          setHiddenCasesCompleted(0);
          return;
        }
        if (event.type === "scenario-start") {
          setActiveHiddenCase(event.label);
          return;
        }
        if (event.type === "scenario-result") {
          setSubmissionScenarios((current) => [
            ...current,
            event.scenario,
          ]);
          setHiddenCasesCompleted(event.index + 1);
          setActiveHiddenCase(null);
          return;
        }
        if (event.type === "suite-complete") {
          setSubmissionReport(event.report);
          setActiveHiddenCase(null);
          return event.report;
        }
        throw new Error(event.error);
      };

      let finalReport: InterviewSubmissionReport;
      if (brain.controllerMode === "code") {
        finalReport = await runBrowserCodeSubmission(
          challengeId,
          brain.controllerCode ?? "",
          receiveEvent,
        );
      } else {
        finalReport = await streamVisualPolicySubmission(
          challengeId,
          compileBrain(brain),
          receiveEvent,
        );
      }

      testTracking.interviewSubmitted(testContext, finalReport.passed);
      if (finalReport.passed) {
        try {
          localStorage.setItem(`ae-complete-${challengeId}`, "true");
        } catch {
          // The current session still records completion.
        }
        if (!completedIds.has(challengeId)) {
          setJustLearned(conceptForChallenge(challengeId) ?? null);
        }
        setCompletedIds((current) => new Set(current).add(challengeId));
        testTracking.problemCompleted(testContext);
      }
    } catch (submitError) {
      setSubmissionError(
        submitError instanceof Error ? submitError.message : String(submitError),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const briefSteps = normalizeBrief(challenge).steps;
  const requiredObjectives = (challenge.objectives ?? [])
    .filter((objective) => !objective.bonus)
    .map((objective) => ({
      id: objective.id,
      label: objective.label,
      check: objective.check,
      hint: undefined,
    }));
  // Task progress and ResultsPanel now use the exact same requirements. Authored
  // learning steps remain in the problem brief as guidance.
  const progressSteps =
    requiredObjectives.length > 0 ? requiredObjectives : briefSteps;
  const stepResults: StepResult[] = session
    ? evaluateSteps(progressSteps, liveContext(session.sim, brain))
    : progressSteps.map((step) => ({
        id: step.id,
        label: step.label,
        hint: step.hint,
        done: false,
        informational: !step.check,
      }));

  const activeIndex = challenges.findIndex((item) => item.id === challengeId);
  const nextChallenge =
    activeIndex >= 0 ? challenges[activeIndex + 1] : undefined;
  const nextUnlocked =
    !!nextChallenge && isChallengeUnlocked(nextChallenge.id, completedIds);
  const visiblePassed = objectiveResults
    ? challengePassed(objectiveResults)
    : session?.sim.status === "reached";
  const passed = objectiveResults
    ? challenge.interviewEvaluation
      ? submissionReport?.passed ?? false
      : visiblePassed
    : session?.sim.status === "reached";
  const stage = session ?? previewSession;
  const previousChallenge =
    activeIndex > 0 ? challenges[activeIndex - 1] : undefined;
  const visibleChallenges = challenges.filter((item) =>
    `${item.number} ${item.name}`
      .toLocaleLowerCase()
      .includes(problemSearch.trim().toLocaleLowerCase()),
  );
  const solvedInPack = challenges.filter((item) =>
    completedIds.has(item.id),
  ).length;

  return (
    <main className="flex min-h-dvh w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-zinc-100 p-2 text-zinc-900 dark:bg-[#0f0f0f] dark:text-zinc-100 xl:h-dvh xl:min-h-0 xl:overflow-hidden">
      <header className="sticky top-2 z-50 flex min-h-14 w-full min-w-0 flex-nowrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-[#1b1b1b]/95 dark:shadow-none xl:static">
        <div className="flex shrink-0 items-center gap-2">
          {!isInterviewWorkspace && (
            <Link
              href={`/${packId}`}
              aria-label={`Back to ${pack?.title ?? packId}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              ←
            </Link>
          )}
          <button
            type="button"
            onClick={() => setProblemListOpen(true)}
            className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ListIcon />
            <span className="hidden text-sm font-semibold sm:inline">
              {isInterviewWorkspace ? "Interview problems" : "Problem list"}
            </span>
          </button>
          {challenge.interviewEvaluation && (
            <>
              <button
                type="button"
                onClick={onSubmitInterview}
                disabled={submitting}
                className="hidden h-9 items-center rounded-lg border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:inline-flex"
              >
                {submitting ? "Testing…" : "Submit Solution"}
              </button>
              {!isInterviewWorkspace && (
                <ShareInterviewLink challengeId={challengeId} />
              )}
            </>
          )}
          <span className="hidden h-5 w-px bg-zinc-200 dark:bg-zinc-700 md:block" />
          <div className="hidden min-w-0 md:block">
            <p className="truncate text-sm font-semibold">
              {challenge.number}. {challenge.name}
            </p>
            <p className="truncate text-[11px] text-zinc-500">
              {pack?.title ?? packId} ·{" "}
              {isInterviewWorkspace
                ? interviewAssignment
                  ? `Shared technical interview · Problem ${interviewAssignment.currentIndex + 1} of ${interviewAssignment.challengeIds.length}`
                  : "Shared technical interview"
                : "Intelligence Studio"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {!isInterviewWorkspace && (
            <>
              <ChallengeArrow
                label="Previous problem"
                href={
                  previousChallenge
                    ? `/${packId}/${previousChallenge.id}`
                    : undefined
                }
                direction="previous"
              />
              <ChallengeArrow
                label="Next problem"
                href={
                  nextChallenge && nextUnlocked
                    ? `/${packId}/${nextChallenge.id}`
                    : undefined
                }
                direction="next"
              />
            </>
          )}
          <button
            type="button"
            onClick={onRun}
            className="ml-1 inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-900 px-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25"
          >
            <RunIcon />
            <span className="hidden sm:inline">Apply &amp; Run</span>
            <span className="sm:hidden">Run</span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isInterviewWorkspace && (
            <ShareInterviewLink
              challengeId={interviewAssignment ? undefined : challengeId}
              sharePath={
                interviewAssignment ? `/i/${interviewAssignment.id}` : undefined
              }
              compact
            />
          )}
          {!isInterviewWorkspace && (
            <Link
              href="/lab"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:block"
            >
              Lab
            </Link>
          )}
          <button
            type="button"
            onClick={() => setWalkthroughOpen(true)}
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:block"
          >
            Guide
          </button>
          <ThemeToggle />
        </div>
      </header>
      <FirstRunCoach />
      <div
        className="sticky top-[4.5rem] z-40 mt-2 grid grid-cols-2 gap-1 rounded-lg border border-zinc-200 bg-white/95 p-1 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 xl:hidden"
        role="tablist"
        aria-label="Challenge workspace"
      >
        {(["build", "run"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mobileWorkspace === tab}
            onClick={() => setMobileWorkspace(tab)}
            className={[
              "rounded-full px-3 py-2 text-xs font-semibold capitalize transition-colors",
              mobileWorkspace === tab
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
            ].join(" ")}
          >
            {tab}
            {tab === "run" && running && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 xl:overflow-hidden">
        {justLearned && (
          <div className="flex items-start justify-between gap-4 rounded-lg border border-zinc-900 bg-zinc-900 p-4 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                You just learned
              </div>
              <div className="mt-0.5 font-semibold">{justLearned.name}</div>
              <div className="mt-0.5 text-sm text-zinc-300 dark:text-zinc-600">
                {justLearned.teaches}
              </div>
            </div>
            <button
              onClick={() => setJustLearned(null)}
              className="shrink-0 rounded-md border border-zinc-700 px-3 py-1.5 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid min-h-0 w-full max-w-full flex-1 grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1.08fr)_minmax(27rem,0.92fr)] xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden">
          <section
            className={[
              "min-h-[38rem] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#1e1e1e] dark:shadow-none xl:flex xl:h-full xl:min-h-0",
              mobileWorkspace === "build" ? "flex" : "hidden",
            ].join(" ")}
          >
            <div className="flex h-13 shrink-0 items-center gap-5 border-b border-zinc-200 bg-zinc-50/80 px-4 dark:border-zinc-800 dark:bg-[#292929]">
              <span className="flex h-full items-center border-b-2 border-zinc-900 text-sm font-semibold text-zinc-900 dark:border-emerald-400 dark:text-zinc-100">
                Build the decision
              </span>
              <span className="text-sm text-zinc-400">Saved automatically</span>
            </div>
            <div className="workspace-scrollbar min-h-0 min-w-0 flex-1 overflow-y-scroll p-4">
              <AuthoringPanel
                challenge={challenge}
                brain={brain}
                onBrainChange={onBrainChange}
                runError={error}
                objectiveResults={objectiveResults}
                attempts={attempts}
                activeRuleId={
                  session && (running || session.step.tick > 0)
                    ? session.step.trace.ruleId
                    : null
                }
              />
            </div>
          </section>

          <section
            className={[
              "min-h-[36rem] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#1e1e1e] dark:shadow-none xl:flex xl:h-full xl:min-h-0",
              mobileWorkspace === "run" ? "flex" : "hidden",
            ].join(" ")}
          >
            <div className="flex min-h-13 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50/80 px-4 py-2 dark:border-zinc-800 dark:bg-[#292929]">
              <div className="flex items-center gap-2">
                <SimulationIcon />
                <span className="text-sm font-semibold">Run the simulation</span>
              </div>
              <span className="rounded-md bg-zinc-200/70 px-2 py-1 font-mono text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {simulationStatusLabel(running, session?.sim.status)}
              </span>
            </div>
            <div className="workspace-scrollbar min-h-0 flex-1 overflow-y-scroll p-4">
              <div className="flex flex-col gap-4">
            {session ? (
              <>
                <SimControls
                  running={running}
                  done={session.sim.isDone}
                  speed={speed}
                  onToggleRun={() => setRunning((current) => !current)}
                  onStep={doStep}
                  onReset={doReset}
                  onSpeedChange={setSpeed}
                  maxSpeed={speedProfile.maximum}
                />
                <SimStage
                  world={session.sim.world}
                  step={session.step}
                  animationRate={speed}
                  footer={
                    <>
                      {(challenge.objectives?.length ?? 0) > 0 ? (
                        <PolicyAuditPanel
                          world={session.sim.world}
                          objectives={challenge.objectives ?? []}
                          results={objectiveResults}
                          liveSteps={stepResults}
                          started
                        />
                      ) : (
                        <TaskChecklist steps={stepResults} started />
                      )}
                      {session.sim.isDone && (
                        <>
                          <ResultsPanel
                            status={
                              session.sim.status as
                                | "running"
                                | "reached"
                                | "stuck"
                                | "out-of-energy"
                            }
                            passed={
                              challenge.interviewEvaluation
                                ? !!visiblePassed
                                : !!passed
                            }
                            scope={
                              challenge.interviewEvaluation
                                ? "visible-case"
                                : "challenge"
                            }
                            results={objectiveResults}
                            onNext={
                              passed && assignmentNextPath
                                ? () => router.push(assignmentNextPath)
                                : !isInterviewWorkspace &&
                                    passed &&
                                    nextChallenge &&
                                    nextUnlocked
                                ? () =>
                                    router.push(
                                      `/${packId}/${nextChallenge.id}`,
                                    )
                                : undefined
                            }
                            onRetry={doReset}
                          />
                        </>
                      )}
                    </>
                  }
                />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Stage · paused
                  </span>
                  <span className="text-xs text-zinc-500">Tick 0</span>
                </div>
                {stage ? (
                  <>
                    <WorldRenderer world={stage.sim.world} />
                    <SimLegend world={stage.sim.world} />
                    {(challenge.objectives?.length ?? 0) > 0 ? (
                      <PolicyAuditPanel
                        world={stage.sim.world}
                        objectives={challenge.objectives ?? []}
                        results={null}
                        liveSteps={stepResults}
                      />
                    ) : (
                      <TaskChecklist steps={stepResults} started={false} />
                    )}
                    <p className="text-xs text-zinc-500">
                      Press{" "}
                      <strong className="text-zinc-700 dark:text-zinc-300">
                        Apply &amp; Run
                      </strong>{" "}
                      to load your brain and start the simulation.
                    </p>
                  </>
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
                    Press Apply &amp; Run to start the simulation.
                  </div>
                )}
              </>
            )}
                {challenge.interviewEvaluation && (
                  <InterviewResultsPanel
                    report={submissionReport}
                    submitting={submitting}
                    error={submissionError}
                    liveScenarios={submissionScenarios}
                    activeScenario={activeHiddenCase}
                    completedScenarios={hiddenCasesCompleted}
                    scenarioCount={challenge.interviewEvaluation.scenarioCount}
                    passingScore={challenge.interviewEvaluation.passingScore}
                    onSubmit={onSubmitInterview}
                  />
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
      {isInterviewWorkspace && problemListOpen && (
        <InterviewProblemDrawer
          challenge={challenge}
          packTitle={pack?.title ?? packId}
          assignment={interviewAssignment}
          onClose={() => setProblemListOpen(false)}
        />
      )}
      {!isInterviewWorkspace && problemListOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setProblemListOpen(false);
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`${pack?.title ?? packId} problem list`}
            className="flex h-full w-[min(92vw,31rem)] flex-col border-r border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#181818]"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
              <div>
                <h2 className="text-xl font-semibold">Problem list</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {solvedInPack}/{challenges.length} solved ·{" "}
                  {pack?.title ?? packId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProblemListOpen(false)}
                aria-label="Close problem list"
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ×
              </button>
            </div>
            <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
              <label className="flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2.5 text-zinc-500 dark:bg-zinc-800/80">
                <SearchIcon />
                <input
                  value={problemSearch}
                  onChange={(event) => setProblemSearch(event.target.value)}
                  placeholder="Search problems"
                  className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-500 dark:text-zinc-100"
                  autoFocus
                />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="flex flex-col gap-1">
                {visibleChallenges.map((item) => {
                  const active = item.id === challengeId;
                  const done = completedIds.has(item.id);
                  const locked =
                    !isChallengeUnlocked(item.id, completedIds) && !done;
                  const difficulty = difficultyFor(item);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        router.push(`/${packId}/${item.id}`);
                        setProblemListOpen(false);
                      }}
                      className={[
                        "flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left transition-colors",
                        active
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                          : locked
                            ? "cursor-not-allowed opacity-45"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      ].join(" ")}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {item.number}. {item.name}
                        </span>
                        <span
                          className={[
                            "mt-0.5 block text-xs",
                            active
                              ? "text-zinc-300 dark:text-zinc-600"
                              : "text-zinc-500",
                          ].join(" ")}
                        >
                          {locked ? "Locked" : done ? "Solved" : "Unsolved"}
                        </span>
                      </span>
                      <span
                        className={[
                          "shrink-0 text-xs font-semibold",
                          difficultyTone(difficulty, active),
                        ].join(" ")}
                      >
                        {difficultyLabel(difficulty)}
                      </span>
                    </button>
                  );
                })}
                {visibleChallenges.length === 0 && (
                  <p className="px-4 py-10 text-center text-sm text-zinc-500">
                    No problems match “{problemSearch}”.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
      {walkthroughOpen && (
        <ChallengeWalkthrough
          challengeName={challenge.name}
          packId={packId}
          includesSubmission={Boolean(challenge.interviewEvaluation)}
          onFinish={finishWalkthrough}
        />
      )}
    </main>
  );
}

function ChallengeArrow({
  label,
  href,
  direction,
}: {
  label: string;
  href?: string;
  direction: "previous" | "next";
}) {
  const className =
    "hidden h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors sm:flex";
  if (!href) {
    return (
      <span
        aria-label={label}
        className={`${className} cursor-not-allowed text-zinc-300 dark:text-zinc-700`}
      >
        {direction === "previous" ? "‹" : "›"}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={`${className} text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white`}
    >
      {direction === "previous" ? "‹" : "›"}
    </Link>
  );
}

function simulationStatusLabel(
  running: boolean,
  status?: "idle" | "running" | "reached" | "stuck" | "out-of-energy",
) {
  if (running) return "Running";
  if (status === "reached") return "Complete";
  if (status === "stuck") return "Stuck";
  if (status === "out-of-energy") return "Out of energy";
  return "Paused";
}

function difficultyLabel(difficulty: DifficultyBand) {
  if (difficulty === "example") return "Tutorial";
  return difficulty[0].toUpperCase() + difficulty.slice(1);
}

function difficultyTone(difficulty: DifficultyBand, active: boolean) {
  if (difficulty === "example") {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (active) return "text-zinc-300 dark:text-zinc-600";
  if (difficulty === "easy") {
    return "text-teal-600 dark:text-teal-400";
  }
  if (difficulty === "medium") return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function ListIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function RunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="m8 5 11 7-11 7V5Z" />
    </svg>
  );
}

function SimulationIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 17V7l8-4 8 4v10l-8 4-8-4Z" />
      <path d="m4 7 8 5 8-5M12 12v9" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
