/**
 * Challenge brief normalization — Milestone 4.
 *
 * A challenge used to render its whole problem statement at once (narrative +
 * objective + intelligence explanation + learning objective + hints), which is
 * overwhelming to read before doing anything. This module derives a *layered*
 * view model from a challenge — a short headline the learner sees immediately,
 * with the prose tucked behind "Learn more" — and a live task checklist.
 *
 * It reads either the new structured fields (`brief`, `context`, `steps`,
 * `taxonomy`) or the legacy free-text ones, so every challenge — and every
 * simulation type — renders one consistent flow. Framework-agnostic, pure.
 */

import { ChallengeData, ChallengeObjective, TaskStep } from "./types";

// ---------------------------------------------------------------------------
// Brief
// ---------------------------------------------------------------------------

export interface NormalizedBrief {
  /** One line: what to do. Always visible. */
  headline: string;
  /** One line of scenario framing. Always visible. */
  context: string;
  /** Longer prose, revealed on demand (narrative, then intelligence notes). */
  detail: string[];
  /** What algorithmic concept this teaches — shown inside "Learn more". */
  learn: string;
  /** The live task checklist (authored steps, else required objectives). */
  steps: TaskStep[];
  /** Escalating hints, revealed one at a time. */
  hints: string[];
}

/** Required (non-bonus) objectives, expressed as checklist steps. */
function objectivesAsSteps(objectives: ChallengeObjective[]): TaskStep[] {
  return objectives
    .filter((o) => !o.bonus)
    .map((o) => ({ id: o.id, label: o.label, check: o.check }));
}

export function normalizeBrief(c: ChallengeData): NormalizedBrief {
  const hints = c.hints ?? (c.hint ? [c.hint] : []);
  const steps =
    c.steps && c.steps.length > 0
      ? c.steps
      : objectivesAsSteps(c.objectives ?? []);
  const detail = [c.narrative, c.intelligenceExplanation].filter(
    (s): s is string => Boolean(s && s.trim()),
  );

  return {
    headline: c.brief?.trim() || c.objective,
    context: c.context?.trim() || c.tagline,
    detail,
    learn: c.learningObjective,
    steps,
    hints,
  };
}

// ---------------------------------------------------------------------------
// Taxonomy (Domain → Simulation → Tier → Grade)
// ---------------------------------------------------------------------------

export interface Taxonomy {
  domain: string;
  simulation: string;
  tier: string;
  grade: number;
  /** Compact badge, e.g. "Tutorial · Grade 1". */
  badge: string;
  /** Full label, e.g. "Warehouse · Tutorial · Grade 1". */
  full: string;
}

const TIER_LABEL: Record<string, string> = {
  tutorial: "Tutorial",
  practice: "Tutorial",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

function titleCase(s: string): string {
  return s.replace(/(^|[\s-])(\w)/g, (_, sep, ch) => sep + ch.toUpperCase());
}

/**
 * Resolve a challenge's catalogue placement. Prefers the structured `taxonomy`
 * block; otherwise infers a sensible one from the legacy `pack` / `stage` /
 * `difficulty` fields so old content still labels cleanly.
 */
export function taxonomyFor(c: ChallengeData): Taxonomy {
  const t = c.taxonomy ?? {};
  const domain = t.domain ?? titleCase(c.pack);
  const simulation = t.simulation ?? titleCase(c.pack);
  const tierKey = t.tier ?? c.stage ?? "easy";
  const tier = TIER_LABEL[tierKey] ?? titleCase(tierKey);
  const grade = t.grade ?? c.difficulty;

  const badge = `${tier} · Grade ${grade}`;
  return { domain, simulation, tier, grade, badge, full: `${domain} · ${badge}` };
}
