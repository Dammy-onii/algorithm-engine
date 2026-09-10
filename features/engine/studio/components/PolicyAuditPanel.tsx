"use client";

import type { ChallengeObjective } from "@/lib/authoring/types";
import type { ObjectiveResult } from "@/lib/authoring/objectives";
import type { StepResult } from "@/lib/authoring/objectives";
import type { World } from "@/lib/engine/world/world";
import {
  parkingPenaltyBreakdown,
  parkingRuntime,
} from "@/lib/engine/worlds/parking";

interface Props {
  world: World;
  objectives: ChallengeObjective[];
  results: ObjectiveResult[] | null;
  liveSteps?: StepResult[];
  started?: boolean;
}

const DECIMAL = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Makes the policy contract auditable while a run is in progress and after it
 * ends. It intentionally uses the same objective definitions as ResultsPanel.
 */
export function PolicyAuditPanel({
  world,
  objectives,
  results,
  liveSteps = [],
  started = false,
}: Props) {
  const resultById = new Map((results ?? []).map((result) => [result.id, result]));
  const liveById = new Map(liveSteps.map((step) => [step.id, step]));
  const required = objectives.filter((objective) => !objective.bonus);
  const completed = required.filter((objective) => {
    const final = resultById.get(objective.id);
    if (final) return final.met;
    return started && liveById.get(objective.id)?.done;
  }).length;
  const parking = parkingRuntime(world);
  const parkingBreakdown = parking ? parkingPenaltyBreakdown(world) : null;
  const violatedVehicles =
    parking?.vehicles.filter((vehicle) => vehicle.violation) ?? [];

  return (
    <details className="group rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
        <span>
          <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Task progress &amp; pass contract
          </span>
          <span className="mt-0.5 block text-[11px] text-zinc-400">
            {started
              ? `${completed}/${required.length} required outcomes currently pass`
              : "The exact requirements used to judge this visible run"}
          </span>
        </span>
        <span className="text-zinc-400 transition-transform group-open:rotate-180">⌄</span>
      </summary>

      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <ul className="space-y-2">
          {objectives.map((objective) => {
            const result = resultById.get(objective.id);
            const live = liveById.get(objective.id);
            const met = result?.met ?? (started && live?.done === true);
            const status = result
              ? met
                ? "passed"
                : "failed"
              : started
                ? met
                  ? "passed"
                  : "running"
                : "not run";
            return (
              <li
                key={objective.id}
                className="rounded border border-zinc-200 bg-zinc-50 px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-800/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                    {objective.label}
                    {objective.bonus && (
                      <span className="ml-1 text-[9px] uppercase text-zinc-400">bonus</span>
                    )}
                  </span>
                  <span
                    className={[
                      "shrink-0 text-[10px] font-semibold uppercase",
                      met
                        ? "text-emerald-600 dark:text-emerald-400"
                        : result
                          ? "text-red-600 dark:text-red-400"
                          : "text-zinc-400",
                    ].join(" ")}
                  >
                    {status}
                  </span>
                </div>
                <code className="mt-1 block break-words text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {objective.check}
                </code>
                {result?.error && (
                  <p className="mt-1 text-[10px] text-red-600 dark:text-red-300">
                    {result.error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        {parkingBreakdown && (
          <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Parking penalty audit
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <AuditValue label="Entrance wait" value={parkingBreakdown.entranceWait} />
              <AuditValue label="Exit wait" value={parkingBreakdown.exitWait} />
              <AuditValue label="Hard violations" value={parkingBreakdown.hardViolations} />
              <AuditValue label="Preferences" value={parkingBreakdown.preferenceViolations} />
              <AuditValue label="Abandonment" value={parkingBreakdown.abandonment} />
              <AuditValue label="Rerouting" value={parkingBreakdown.reassignments} />
              <AuditValue label="Congestion" value={parkingBreakdown.congestion} />
              <AuditValue label="Active queues" value={parkingBreakdown.activeQueues} />
            </div>
            <div className="mt-2 flex justify-between rounded bg-zinc-100 px-2.5 py-2 text-xs dark:bg-zinc-800">
              <span className="font-medium">Total operating penalty</span>
              <span className="font-mono font-semibold">
                {DECIMAL.format(parkingBreakdown.total)}
              </span>
            </div>

            {violatedVehicles.length > 0 ? (
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                  Allocation violations
                </p>
                <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">
                  {violatedVehicles.map((vehicle) => (
                    <li
                      key={vehicle.id}
                      className="rounded border border-red-100 bg-red-50 px-2 py-1.5 text-[10px] text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200"
                    >
                      <span className="font-mono font-semibold">
                        {vehicle.id} → {vehicle.assignedSpaceId ?? "unassigned"}
                      </span>
                      {vehicle.violationReasons.map((reason) => (
                        <p key={reason} className="mt-0.5 leading-relaxed">
                          {reason}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-2 text-[10px] text-zinc-400">
                No parking allocation violation has been recorded.
              </p>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

function AuditValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800">
      <p className="text-[9px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-0.5 font-mono text-[11px] font-semibold">
        {DECIMAL.format(value)}
      </p>
    </div>
  );
}
