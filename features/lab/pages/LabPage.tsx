"use client";

import { useCallback, useEffect, useState } from "react";

import type { BrainSource } from "@/lib/engine/simulation";
import {
  BRAINS,
  WORLDS,
  findBrain,
} from "@/lib/content/datasets";
import {
  BRAIN_LAYERS,
  BrainEditor,
  type BrainLayer,
  type BrainTexts,
} from "@/features/lab/components/BrainEditor";
import { PageLayout } from "@/features/application/components/PageLayout";
import { SimControls } from "@/features/simulation/components/SimControls";
import { SimStage } from "@/features/simulation/components/SimStage";
import { createSimulationSession } from "@/features/simulation/session";
import type { SimulationSession } from "@/features/simulation/types";

const selectClass =
  "rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function brainToTexts(brainKey: string): BrainTexts {
  const source = findBrain(brainKey).source;
  return {
    goals: JSON.stringify(source.goals, null, 2),
    states: JSON.stringify(source.states, null, 2),
    rules: JSON.stringify(source.rules, null, 2),
    functions: JSON.stringify(source.functions, null, 2),
    memory: JSON.stringify(source.memory, null, 2),
  };
}

function textsToBrain(
  texts: BrainTexts,
): { source: BrainSource } | { error: string } {
  const output: Record<string, unknown> = {};
  for (const layer of BRAIN_LAYERS) {
    try {
      output[layer] = JSON.parse(texts[layer]);
    } catch (error) {
      return {
        error: `${layer}.json — ${
          error instanceof Error ? error.message : "invalid JSON"
        }`,
      };
    }
  }
  return { source: output as unknown as BrainSource };
}

function initialSession(): SimulationSession {
  const result = createSimulationSession(
    WORLDS[0].key,
    findBrain(BRAINS[0].key).source,
  );
  if ("error" in result) {
    throw new Error(result.error);
  }
  return result.session;
}

/** Complete interactive UI and state for `/lab`. */
export function LabPageView() {
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [worldKey, setWorldKey] = useState(WORLDS[0].key);
  const [brainKey, setBrainKey] = useState(BRAINS[0].key);
  const [texts, setTexts] = useState<BrainTexts>(() =>
    brainToTexts(BRAINS[0].key),
  );
  const [activeLayer, setActiveLayer] = useState<BrainLayer>("rules");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SimulationSession>(initialSession);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const next = session.sim.tick();
      setSession({ sim: session.sim, step: next });
      if (session.sim.isDone) setRunning(false);
    }, 1000 / speed);
    return () => clearInterval(interval);
  }, [running, session, speed]);

  const rebuild = useCallback((key: string, brainTexts: BrainTexts) => {
    const parsed = textsToBrain(brainTexts);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    const result = createSimulationSession(key, parsed.source);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError(null);
    setRunning(false);
    setSession(result.session);
  }, []);

  const onWorldChange = (key: string) => {
    setWorldKey(key);
    rebuild(key, texts);
  };

  const onBrainChange = (key: string) => {
    const next = brainToTexts(key);
    setBrainKey(key);
    setTexts(next);
    rebuild(worldKey, next);
  };

  const onLayerChange = (layer: BrainLayer, value: string) => {
    setTexts((current) => ({ ...current, [layer]: value }));
  };

  const doStep = () => {
    const next = session.sim.tick();
    setSession({ sim: session.sim, step: next });
  };

  let functionIds: string[] = [];
  try {
    const parsed = JSON.parse(texts.functions) as { id: string }[];
    functionIds = Array.isArray(parsed)
      ? parsed.map((item) => item.id)
      : [];
  } catch {
    functionIds = [];
  }

  return (
    <PageLayout
      title="Engine Lab"
      subtitle="Raw JSON harness"
      backLabel="All worlds"
      backHref="/"
      action={{ label: "Studio", href: "/maze" }}
      className="max-w-7xl"
    >
      <div className="flex flex-col gap-6">
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          The engine loads a world and an agent&apos;s brain from data, then
          loops: observe → decide → act → update → render. Every layer of the
          brain is editable below — change goals, states, rules, functions, or
          memory, press Apply &amp; Reset, and the same engine executes what you
          wrote.
        </p>

        <SimControls
          running={running}
          done={session.sim.isDone}
          speed={speed}
          onToggleRun={() => setRunning((current) => !current)}
          onStep={doStep}
          onReset={() => rebuild(worldKey, texts)}
          onSpeedChange={setSpeed}
          leading={
            <>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500">World</span>
                <select
                  className={selectClass}
                  value={worldKey}
                  onChange={(event) => onWorldChange(event.target.value)}
                >
                  {WORLDS.map((world) => (
                    <option key={world.key} value={world.key}>
                      {world.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500">Brain</span>
                <select
                  className={selectClass}
                  value={brainKey}
                  onChange={(event) => onBrainChange(event.target.value)}
                >
                  {BRAINS.map((brainOption) => (
                    <option key={brainOption.key} value={brainOption.key}>
                      {brainOption.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          }
        />

        <SimStage
          world={session.sim.world}
          step={session.step}
          layout="beside"
          animationRate={speed}
        />

        <BrainEditor
          texts={texts}
          active={activeLayer}
          onSelect={setActiveLayer}
          onChange={onLayerChange}
          onApply={() => rebuild(worldKey, texts)}
          error={error}
          functionIds={functionIds}
        />
      </div>
    </PageLayout>
  );
}
