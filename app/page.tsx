"use client";

/**
 * Algorithm Engine — combined Studio + Lab page.
 *
 * Two modes on one page, sharing the same engine:
 *   Studio (default) — Intelligence Authoring System (Milestone 2)
 *   Lab              — Raw JSON editor harness (Milestone 1, preserved)
 *
 * The engine in lib/engine/ is completely unchanged in both modes.
 * The Studio feeds it a VisualBrain compiled to BrainSource;
 * the Lab feeds it raw JSON text parsed to BrainSource.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { Simulation, BrainSource, WorldSource } from "@/lib/engine/simulation";
import { SimStep } from "@/lib/engine/types";
import { BRAINS, WORLDS, findBrain, findWorld } from "@/app/lib/datasets";
import { MazeRenderer } from "@/app/components/MazeRenderer";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { SimControls } from "@/app/components/sim/SimControls";
import { SimStage, SimLegend } from "@/app/components/sim/SimStage";
import {
  BrainEditor,
  BRAIN_LAYERS,
  BrainLayer,
  BrainTexts,
} from "@/app/components/BrainEditor";

import { CHALLENGES, findChallenge, challengeStorageKey } from "@/challenges/index";
import { decompileBrain } from "@/lib/authoring/brainDecompiler";
import { compileBrain } from "@/lib/authoring/brainCompiler";
import {
  ObjectiveResult,
  evaluateObjectives,
  metricsFromSim,
  challengePassed,
} from "@/lib/authoring/objectives";
import { Concept, conceptForChallenge } from "@/lib/curriculum/concepts";
import { VisualBrain } from "@/lib/authoring/types";
import { ChallengeSelector } from "@/app/components/studio/ChallengeSelector";
import { AuthoringPanel } from "@/app/components/studio/AuthoringPanel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Engine {
  sim: Simulation;
  step: SimStep;
}

type PageMode = "studio" | "lab";

// ---------------------------------------------------------------------------
// Lab mode helpers (unchanged from M1)
// ---------------------------------------------------------------------------

function brainToTexts(brainKey: string): BrainTexts {
  const s = findBrain(brainKey).source;
  return {
    goals: JSON.stringify(s.goals, null, 2),
    states: JSON.stringify(s.states, null, 2),
    rules: JSON.stringify(s.rules, null, 2),
    functions: JSON.stringify(s.functions, null, 2),
    memory: JSON.stringify(s.memory, null, 2),
  };
}

function textsToBrain(texts: BrainTexts): { source: BrainSource } | { error: string } {
  const out: Record<string, unknown> = {};
  for (const layer of BRAIN_LAYERS) {
    try {
      out[layer] = JSON.parse(texts[layer]);
    } catch (e) {
      return {
        error: `${layer}.json — ${e instanceof Error ? e.message : "invalid JSON"}`,
      };
    }
  }
  return { source: out as unknown as BrainSource };
}

function makeEngine(
  worldKey: string,
  brainSource: BrainSource,
): { engine: Engine } | { error: string } {
  const world: WorldSource = findWorld(worldKey).source;
  try {
    const sim = new Simulation(world, brainSource);
    return { engine: { sim, step: sim.snapshot() } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------------------------------------------------------------------
// Studio mode helpers
// ---------------------------------------------------------------------------

/** SSR-safe: derive the editor brain from the challenge scaffold only. */
function scaffoldBrainFor(challengeId: string): VisualBrain {
  return decompileBrain(findChallenge(challengeId).scaffoldBrain as BrainSource);
}

/**
 * Fill in any layer missing from a persisted brain. Brains saved before a new
 * layer existed (e.g. `derived`) would otherwise arrive without it and crash the
 * editor — this keeps old saves forward-compatible.
 */
function normalizeBrain(b: Partial<VisualBrain>): VisualBrain {
  return {
    goals: b.goals ?? [],
    initial: b.initial ?? (b.states?.[0]?.id ?? "start"),
    states: b.states ?? [{ id: "start", description: "" }],
    rules: b.rules ?? [],
    functions: b.functions ?? [],
    derived: b.derived ?? [],
    memory: b.memory ?? {},
  };
}

/** Client-only: read a persisted brain from localStorage, or null. */
function readStoredBrain(challengeId: string): VisualBrain | null {
  try {
    const stored = localStorage.getItem(challengeStorageKey(challengeId));
    return stored ? normalizeBrain(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

/** Client-only: stored brain if present, else the scaffold. Use in event handlers. */
function loadOrDefaultBrain(challengeId: string): VisualBrain {
  return readStoredBrain(challengeId) ?? scaffoldBrainFor(challengeId);
}

function saveBrain(challengeId: string, brain: VisualBrain) {
  try {
    localStorage.setItem(challengeStorageKey(challengeId), JSON.stringify(brain));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  const [mode, setMode] = useState<PageMode>("studio");
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  // --- Studio state ---
  const [challengeId, setChallengeId] = useState(CHALLENGES[0].id);
  // Init from the scaffold only (deterministic on server + client). Any persisted
  // brain is loaded after mount in the effect below to avoid a hydration mismatch.
  const [visualBrain, setVisualBrain] = useState<VisualBrain>(() =>
    scaffoldBrainFor(CHALLENGES[0].id),
  );
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [studioError, setStudioError] = useState<string | null>(null);
  const [studioEngine, setStudioEngine] = useState<Engine | null>(null);
  const [objectiveResults, setObjectiveResults] = useState<ObjectiveResult[] | null>(null);
  // Curriculum feedback: the concept just mastered (first completion), and how
  // many runs have failed on this challenge (drives escalating hints).
  const [justLearned, setJustLearned] = useState<Concept | null>(null);
  const [attempts, setAttempts] = useState(0);

  // Hydrate client-only persisted state (localStorage) after mount.
  useEffect(() => {
    const stored = readStoredBrain(CHALLENGES[0].id);
    const done = new Set<string>();
    for (const c of CHALLENGES) {
      try {
        if (localStorage.getItem(`ae-complete-${c.id}`) === "true") done.add(c.id);
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setVisualBrain(stored);
    if (done.size) setCompletedIds(done);
  }, []);

  // --- Lab state ---
  const [worldKey, setWorldKey] = useState(WORLDS[0].key);
  const [brainKey, setBrainKey] = useState(BRAINS[0].key);
  const [texts, setTexts] = useState<BrainTexts>(() => brainToTexts(BRAINS[0].key));
  const [activeLayer, setActiveLayer] = useState<BrainLayer>("rules");
  const [labError, setLabError] = useState<string | null>(null);
  const [labEngine, setLabEngine] = useState<Engine>(() => {
    const built = makeEngine(WORLDS[0].key, findBrain(BRAINS[0].key).source);
    return "engine" in built ? built.engine : (undefined as never);
  });

  // A paused, tick-0 stage for the selected challenge, shown before the user
  // presses Apply & Run. Built from the challenge scaffold (always valid) so the
  // user can see the world, the robot's start position and facing up front.
  const previewEngine = useMemo(() => {
    const ch = findChallenge(challengeId);
    const built = makeEngine(ch.worldKey, ch.scaffoldBrain as BrainSource);
    return "engine" in built ? built.engine : null;
  }, [challengeId]);

  /** What the Studio stage renders: the live run if there is one, else the preview. */
  const studioStage = studioEngine ?? previewEngine;

  // Active engine based on mode
  const engine = mode === "studio" ? studioEngine : labEngine;
  const done = engine?.sim.isDone ?? false;

  // ---------------------------------------------------------------------------
  // Tick loop (shared)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!running || !engine) return;
    const id = setInterval(() => {
      const next = engine.sim.tick();
      if (mode === "studio") {
        setStudioEngine({ sim: engine.sim, step: next });
        if (engine.sim.isDone) {
          setRunning(false);
          // Grade the finished run against the challenge's objectives.
          const challenge = findChallenge(challengeId);
          const metrics = metricsFromSim(engine.sim, visualBrain);
          const results = evaluateObjectives(challenge.objectives ?? [], metrics);
          setObjectiveResults(results);
          if (challengePassed(results)) {
            try {
              localStorage.setItem(`ae-complete-${challengeId}`, "true");
            } catch {
              /* ignore */
            }
            // First completion of this challenge → celebrate the concept learned.
            if (!completedIds.has(challengeId)) {
              setJustLearned(conceptForChallenge(challengeId) ?? null);
            }
            setCompletedIds((prev) => new Set(prev).add(challengeId));
            setAttempts(0);
          } else {
            setAttempts((n) => n + 1);
          }
        }
      } else {
        setLabEngine({ sim: engine.sim, step: next });
        if (engine.sim.isDone) setRunning(false);
      }
    }, 1000 / speed);
    return () => clearInterval(id);
  }, [running, speed, engine, mode, challengeId, visualBrain, completedIds]);

  // ---------------------------------------------------------------------------
  // Studio callbacks
  // ---------------------------------------------------------------------------

  const onChallengeSelect = (id: string) => {
    setRunning(false);
    setChallengeId(id);
    setStudioEngine(null);
    setStudioError(null);
    setObjectiveResults(null);
    setJustLearned(null);
    setAttempts(0);
    const brain = loadOrDefaultBrain(id);
    setVisualBrain(brain);
  };

  // Accept either a next brain or an updater. Editors that derive the next state
  // from the current one (e.g. appending a rule) must use the functional form so
  // rapid successive edits don't clobber each other.
  const onBrainChange = (next: VisualBrain | ((prev: VisualBrain) => VisualBrain)) => {
    setVisualBrain((prev) => {
      const brain = typeof next === "function" ? next(prev) : next;
      saveBrain(challengeId, brain);
      return brain;
    });
  };

  const onRun = useCallback(() => {
    setRunning(false);
    const challenge = findChallenge(challengeId);
    let brainSource: BrainSource;
    try {
      brainSource = compileBrain(visualBrain);
    } catch (e) {
      setStudioError(e instanceof Error ? e.message : String(e));
      return;
    }
    const built = makeEngine(challenge.worldKey, brainSource);
    if ("error" in built) {
      setStudioError(built.error);
      return;
    }
    setStudioError(null);
    setObjectiveResults(null);
    setJustLearned(null);
    setStudioEngine(built.engine);
    setRunning(true);
  }, [challengeId, visualBrain]);

  // ---------------------------------------------------------------------------
  // Lab callbacks
  // ---------------------------------------------------------------------------

  const rebuildLab = useCallback((wKey: string, brainTexts: BrainTexts) => {
    const parsed = textsToBrain(brainTexts);
    if ("error" in parsed) { setLabError(parsed.error); return; }
    const built = makeEngine(wKey, parsed.source);
    if ("error" in built) { setLabError(built.error); return; }
    setLabError(null);
    setRunning(false);
    setLabEngine(built.engine);
  }, []);

  const onWorldChange = (k: string) => { setWorldKey(k); rebuildLab(k, texts); };
  const onBrainKeyChange = (k: string) => {
    const next = brainToTexts(k);
    setBrainKey(k);
    setTexts(next);
    rebuildLab(worldKey, next);
  };
  const onLayerChange = (layer: BrainLayer, value: string) =>
    setTexts((prev) => ({ ...prev, [layer]: value }));
  const applyLab = () => rebuildLab(worldKey, texts);

  let labFunctionIds: string[] = [];
  try {
    const parsed = JSON.parse(texts.functions) as { id: string }[];
    labFunctionIds = Array.isArray(parsed) ? parsed.map((f) => f.id) : [];
  } catch { labFunctionIds = []; }

  // ---------------------------------------------------------------------------
  // Shared controls
  // ---------------------------------------------------------------------------

  const doStep = () => {
    if (!engine) return;
    const next = engine.sim.tick();
    if (mode === "studio") setStudioEngine({ sim: engine.sim, step: next });
    else setLabEngine({ sim: engine.sim, step: next });
  };

  const doReset = () => {
    setRunning(false);
    if (mode === "studio") {
      onRun();
    } else {
      rebuildLab(worldKey, texts);
    }
  };

  // Lab world/brain selector styling (shared transport lives in SimControls).
  const selectClass =
    "rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900";

  const challenge = findChallenge(challengeId);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-6 p-6">
      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Algorithm Engine
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {mode === "studio"
              ? "Intelligence Studio — Milestone 2"
              : "Engine Lab — Milestone 1 raw harness"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
            {(["studio", "lab"] as PageMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setRunning(false); }}
                className={[
                  "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                  mode === m
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
                ].join(" ")}
              >
                {m === "studio" ? "Studio" : "Lab"}
              </button>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Studio Mode ── */}
      {mode === "studio" && (
        <div className="flex flex-col gap-4">
          {/* Challenge picker */}
          <ChallengeSelector
            challenges={CHALLENGES}
            activeId={challengeId}
            completedIds={completedIds}
            onSelect={onChallengeSelect}
          />

          {/* "You just learned" callout — first time a concept is mastered */}
          {justLearned && (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-zinc-900 bg-zinc-900 p-4 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  You just learned
                </div>
                <div className="mt-0.5 text-base font-semibold">{justLearned.name}</div>
                <div className="mt-0.5 text-sm text-zinc-300 dark:text-zinc-600">
                  {justLearned.teaches}
                </div>
              </div>
              <button
                onClick={() => setJustLearned(null)}
                className="shrink-0 rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800 dark:border-zinc-300 dark:text-zinc-700 dark:hover:bg-zinc-200"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Workspace split */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Left: Authoring */}
            <div className="flex-1 min-w-0">
              <AuthoringPanel
                challenge={challenge}
                brain={visualBrain}
                onBrainChange={onBrainChange}
                onRun={onRun}
                runError={studioError}
                objectiveResults={objectiveResults}
                attempts={attempts}
              />
            </div>

            {/* Right: Simulation */}
            <div className="flex flex-col gap-4 lg:w-80 xl:w-96">
              {studioEngine ? (
                <>
                  <SimControls
                    running={running}
                    done={done}
                    speed={speed}
                    onToggleRun={() => setRunning((r) => !r)}
                    onStep={doStep}
                    onReset={doReset}
                    onSpeedChange={setSpeed}
                  />
                  <SimStage
                    world={studioEngine.sim.world}
                    step={studioEngine.step}
                    layout="stacked"
                    footer={
                      <>
                        {studioEngine.sim.status === "reached" && (
                          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              Goal reached
                            </div>
                            <div className="mt-0.5 text-xs text-zinc-500">
                              Challenge complete — try the next one.
                            </div>
                          </div>
                        )}
                        {studioEngine.sim.status === "stuck" && (
                          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              Stuck
                            </div>
                            <div className="mt-0.5 text-xs text-zinc-500">
                              The robot stopped making progress. Revise your rules and run again.
                            </div>
                          </div>
                        )}
                      </>
                    }
                  />
                </>
              ) : (
                /* Paused preview of the stage — the world, the robot at its start
                   position and facing, before any brain has been run. */
                <>
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Stage · paused
                    </span>
                    <span className="text-xs text-zinc-500">Tick 0</span>
                  </div>

                  {studioStage ? (
                    <>
                      <MazeRenderer world={studioStage.sim.world} />
                      <SimLegend />
                      <p className="text-xs text-zinc-500">
                        The robot starts at the outlined tile facing{" "}
                        <span className="font-mono text-zinc-700 dark:text-zinc-300">
                          {studioStage.sim.world.agent.direction}
                        </span>
                        . Press{" "}
                        <strong className="font-semibold text-zinc-700 dark:text-zinc-300">
                          Apply &amp; Run
                        </strong>{" "}
                        to load your brain and start the simulation.
                      </p>
                    </>
                  ) : (
                    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
                      Press Apply &amp; Run to start the simulation.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Lab Mode (M1 harness — preserved exactly) ── */}
      {mode === "lab" && (
        <div className="flex flex-col gap-6">
          <header>
            <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              The engine loads a world and an agent&apos;s brain from data, then loops:
              observe → decide → act → update → render. Every layer of the brain is
              editable below — change goals, states, rules, functions, or memory, press
              Apply & Reset, and the same engine executes what you wrote.
            </p>
          </header>

          <SimControls
            running={running}
            done={labEngine.sim.isDone}
            speed={speed}
            onToggleRun={() => setRunning((r) => !r)}
            onStep={doStep}
            onReset={doReset}
            onSpeedChange={setSpeed}
            leading={
              <>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500">World</span>
                  <select className={selectClass} value={worldKey} onChange={(e) => onWorldChange(e.target.value)}>
                    {WORLDS.map((w) => (
                      <option key={w.key} value={w.key}>{w.label}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500">Brain</span>
                  <select className={selectClass} value={brainKey} onChange={(e) => onBrainKeyChange(e.target.value)}>
                    {BRAINS.map((b) => (
                      <option key={b.key} value={b.key}>{b.label}</option>
                    ))}
                  </select>
                </label>
              </>
            }
          />

          <SimStage world={labEngine.sim.world} step={labEngine.step} layout="beside" />

          <BrainEditor
            texts={texts}
            active={activeLayer}
            onSelect={setActiveLayer}
            onChange={onLayerChange}
            onApply={applyLab}
            error={labError}
            functionIds={labFunctionIds}
          />
        </div>
      )}
    </main>
  );
}
