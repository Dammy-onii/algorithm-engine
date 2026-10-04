"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MAZE,
  MAZE_W,
  RULES,
  initialState,
  observe,
  step,
  type SimState,
} from "../lib/sim";

const TICK_MS = 190;

/** Renders the maze, the agent, and the rule set that is driving it. */
export function LiveSim() {
  const [state, setState] = useState<SimState>(initialState);
  const [running, setRunning] = useState(true);
  const [swapped, setSwapped] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  // Promoting the catch-all rule is a genuine break, not a cosmetic one: it
  // matches on every tick and starves the two rules under it, so the agent spins
  // in place forever. Verified — it never reaches the goal.
  const rules = useMemo(
    () => (swapped ? [RULES[2], RULES[0], RULES[1]] : RULES),
    [swapped],
  );

  const reset = useCallback(() => setState(initialState()), []);

  // Pause while off-screen so the page stays cheap.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.15,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running || !visible) return;
    const t = setInterval(() => {
      setState((s) => {
        // A solved run loops back to the start so the demo keeps playing. A
        // broken one is left running on purpose — the climbing tick count next
        // to a frozen cell count is the whole lesson.
        if (s.solved) return initialState();
        return step(s, rules);
      });
    }, TICK_MS);
    return () => clearInterval(t);
  }, [running, visible, rules]);

  // Reset the demo when the rule order is toggled; setState-in-effect is
  // intentional here for a self-contained illustration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(reset, [swapped, reset]);

  const obs = observe(state.agent);
  const flags: [string, boolean][] = [
    ["wallAhead", obs.wallAhead],
    ["wallRight", obs.wallRight],
    ["wallLeft", obs.wallLeft],
    ["atGoal", obs.atGoal],
  ];

  return (
    <div
      ref={hostRef}
      className="overflow-hidden rounded-card border border-line bg-white shadow-[0_1px_2px_rgba(10,10,11,0.04),0_12px_40px_-24px_rgba(10,10,11,0.35)]"
    >
      {/* window chrome */}
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[11px] text-ink-40">
          <span className="size-2 rounded-full bg-volt" />
          ctrl · maze-nav · run #1
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-ink-60 transition hover:border-ink/30 hover:text-ink"
          >
            {running ? "Pause" : "Play"}
          </button>
          <button
            onClick={reset}
            className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-ink-60 transition hover:border-ink/30 hover:text-ink"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid gap-0 md:grid-cols-[1.15fr_1fr]">
        {/* ---- the world ---- */}
        <div className="border-b border-line-soft p-5 md:border-r md:border-b-0">
          <div
            className="mx-auto grid w-full max-w-[420px] gap-[2px]"
            style={{ gridTemplateColumns: `repeat(${MAZE_W}, minmax(0, 1fr))` }}
          >
            {MAZE.flatMap((row, y) =>
              row.map((cell, x) => {
                const isAgent = state.agent.x === x && state.agent.y === y;
                const visited = state.trail.includes(`${x},${y}`);
                const isGoal = cell === "G";
                return (
                  <div
                    key={`${x}-${y}`}
                    className={`aspect-square rounded-[2px] transition-colors duration-200 ${
                      cell === "#"
                        ? "bg-ink/85"
                        : isGoal
                          ? "bg-volt"
                          : visited
                            ? "bg-signal/12"
                            : "bg-line-soft"
                    }`}
                  >
                    {isAgent && (
                      <div className="grid size-full place-items-center">
                        <div
                          className="size-full rounded-[2px] bg-signal transition-transform duration-150"
                          style={{ transform: `rotate(${state.agent.dir * 90}deg)` }}
                        >
                          <svg viewBox="0 0 10 10" className="size-full text-white">
                            <path d="M5 2.4 7.2 7.2H2.8z" fill="currentColor" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }),
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[11px] text-ink-40">
            <span>
              step <span className="text-ink">{String(state.tick).padStart(3, "0")}</span>
            </span>
            <span>
              spaces visited <span className="text-ink">{state.trail.length}</span>
            </span>
            <span>
              last move <span className="text-ink">{state.lastAction ?? "—"}</span>
            </span>
            <span
              className={
                state.solved ? "rounded-full bg-volt px-2 py-0.5 text-ink" : ""
              }
            >
              {state.solved ? "goal reached" : "running"}
            </span>
          </div>
        </div>

        {/* ---- the intelligence ---- */}
        <div className="p-5">
          <p className="font-mono text-[11px] tracking-[0.16em] text-ink-40 uppercase">
            What the agent sees
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {flags.map(([name, on]) => (
              <span
                key={name}
                className={`rounded-full px-2.5 py-1 font-mono text-[11px] transition ${
                  on
                    ? "bg-ink text-white"
                    : "border border-line text-ink-40"
                }`}
              >
                {name}
              </span>
            ))}
          </div>

          <p className="mt-6 font-mono text-[11px] tracking-[0.16em] text-ink-40 uppercase">
            Instructions · checked in order
          </p>
          <ol className="mt-3 space-y-1.5">
            {rules.map((r, idx) => {
              const active = state.activeRule === r.id;
              return (
                <li
                  key={r.id}
                  className={`rounded-xl border px-3 py-2.5 transition ${
                    active
                      ? "border-signal/40 bg-signal/6"
                      : "border-line bg-white"
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`font-mono text-[11px] ${
                        active ? "text-signal" : "text-ink-40"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <p className="text-[13px] leading-snug">
                      <span className="font-mono text-[11px] tracking-wide text-ink-40">
                        WHEN{" "}
                      </span>
                      <span className="font-medium">{r.label}</span>
                      <span className="font-mono text-[11px] tracking-wide text-ink-40">
                        {" "}
                        DO{" "}
                      </span>
                      <span className="text-ink-60">{r.does}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-line-soft/70 p-3">
            <input
              type="checkbox"
              checked={swapped}
              onChange={(e) => setSwapped(e.target.checked)}
              className="mt-0.5 size-4 accent-[#4f46e5]"
            />
            <span className="text-[13px] leading-snug text-ink-60">
              <span className="font-medium text-ink">Move the “otherwise” rule to the top.</span>{" "}
              It always applies, so the other two rules never get a chance. The agent stays in
              its first space. The instructions are the same, but their order changes the result.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
