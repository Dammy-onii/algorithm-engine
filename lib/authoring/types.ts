/**
 * Visual model types for the Intelligence Authoring System (Milestone 2).
 *
 * A VisualBrain is the in-memory representation of what the user has built
 * in the visual editor. It mirrors the five brain layers but is structured
 * for UI consumption: conditions are parsed into atoms rather than raw
 * strings, and functions carry a `isBuiltIn` flag so the UI can distinguish
 * engine primitives from user-composed bricks.
 *
 * Data flow:
 *   BrainSource (JSON) → brainDecompiler → VisualBrain (editor state)
 *   VisualBrain (editor state) → brainCompiler → BrainSource → engine
 */

// ---------------------------------------------------------------------------
// Condition model
// ---------------------------------------------------------------------------

export type ComparisonOp = "<" | ">" | "<=" | ">=" | "==" | "!=";
export type LogicalOp = "&&" | "||";

/**
 * A single condition atom. Either a boolean flag (wallAhead, goalVisible…)
 * optionally negated, or a numeric comparison (energy < 20).
 */
export interface ConditionAtom {
  /** The observation identifier, e.g. "wallAhead", "energy", "always". */
  flag: string;
  /** True → rendered as `!flag`. Ignored when `comparison` is set. */
  negated: boolean;
  /** Present only for numeric flags (energy, visitedCount, tick). */
  comparison?: { op: ComparisonOp; value: number };
}

/**
 * A flat list of atoms joined by one logical operator.
 *
 * Limitation (by design): the guided editor only supports flat AND or flat
 * OR chains — no parenthesised sub-expressions. Conditions more complex than
 * that fall back to ConditionRaw and are edited as a plain string.
 */
export interface ConditionGroup {
  operator: LogicalOp;
  atoms: ConditionAtom[];
}

/** Guided mode: condition expressed as structured atoms the UI renders as chips. */
export type ConditionGuided = { mode: "guided"; group: ConditionGroup };
/** Raw mode: the expression is kept as a plain string (advanced / complex). */
export type ConditionRaw = { mode: "raw"; expr: string };

export type VisualCondition = ConditionGuided | ConditionRaw;

// ---------------------------------------------------------------------------
// Brain layers
// ---------------------------------------------------------------------------

export interface VisualGoal {
  id: string;
  priority: number;
  description: string;
  /** Condition string; empty string = "always active". */
  activeWhen: string;
}

export interface VisualState {
  id: string;
  description: string;
}

/** An editor-only category for keeping a large rule set understandable. */
export interface VisualRuleFolder {
  id: string;
  name: string;
  /** Editor-only visibility preference. Collapsing never changes rule order. */
  collapsed?: boolean;
}

export interface VisualRule {
  id: string;
  /** null = rule applies in any state. */
  state: string | null;
  condition: VisualCondition;
  /** Id of the function brick to execute when this rule fires. */
  functionId: string;
  /** null = no state transition. */
  setState: string | null;
  priority: number;
  description: string;
  /** Optional editor-only category. It does not affect engine evaluation. */
  folderId?: string;
}

export interface VisualFunction {
  id: string;
  description: string;
  /**
   * Single-step: `action` is set (one of the four engine primitives).
   * Multi-step: `steps` is set (ordered list of action types or function ids).
   * Exactly one of the two must be present.
   */
  action?: string;
  steps?: string[];
  /**
   * True = this brick wraps a core or world-module primitive and cannot be deleted.
   * False = user-composed; editable and removable.
   */
  isBuiltIn: boolean;
}

/**
 * A user-defined named condition — the perceptual mirror of a multi-step brick.
 * Composes existing observation flags into new named knowledge, e.g.
 *   deadEnd = wallAhead && wallLeft && wallRight
 */
export interface VisualDerivedCondition {
  id: string;
  expr: string;
  description: string;
}

/** The complete visual model of one brain — all six layers. */
export interface VisualBrain {
  goals: VisualGoal[];
  /** Id of the initial state. */
  initial: string;
  states: VisualState[];
  rules: VisualRule[];
  /** Optional for backwards-compatible saved brains created before folders. */
  ruleFolders?: VisualRuleFolder[];
  functions: VisualFunction[];
  /** User-defined named conditions (composable perception). */
  derived: VisualDerivedCondition[];
  memory: Record<string, unknown>;
  /** Optional local Code-mode controller source. Omitted means visual rules run. */
  controllerCode?: string;
}

// ---------------------------------------------------------------------------
// Challenge-level types
// ---------------------------------------------------------------------------

/**
 * Which engine features are exposed to the user in this challenge.
 * Level 1: only pre-built bricks available; Functions tab locked.
 * Level 2: Functions tab unlocked; user composes custom bricks.
 */
export type ChallengeLevel = 1 | 2 | 3;

/**
 * A machine-checkable objective. `check` is an expression evaluated against the
 * run's metrics (see lib/authoring/objectives.ts) once the simulation ends —
 * e.g. "reached", "reached && ticks <= 30", "reached && rules <= 3".
 *
 * Objectives grade the *quality* of an algorithm, not just its correctness,
 * which is the scoring substrate competitions and interviews will build on.
 */
export interface ChallengeObjective {
  id: string;
  label: string;
  check: string;
  /** Optional objectives are stretch goals — they do not gate completion. */
  bonus?: boolean;
}

/**
 * One item in a challenge's live task flow — the plain-English "to-do list" a
 * learner watches tick off *while the simulation runs*, rather than reading a
 * wall of prose up front. `check` is the same expression grammar objectives use,
 * evaluated every tick against the run's live metrics + the current observation
 * (so a step can say `carryingPackage`, `deliveredCount >= 1`, `reached`, …).
 *
 * A step with no `check` is informational (always shown as pending guidance).
 * This is world-agnostic: maze, warehouse and finance all describe their work
 * as steps, so the same flow UI serves every simulation type.
 */
export interface TaskStep {
  id: string;
  label: string;
  check?: string;
  /** Optional one-line "how" for this specific step. */
  hint?: string;
}

/**
 * How a challenge is placed in the catalogue. Difficulty for a simulation
 * platform is not a single axis, so instead of a lone "Level N" we locate a
 * challenge as Domain → Simulation → Tier → Grade, where each grade introduces
 * new *decision complexity*, not just more data. All fields are optional and
 * fall back to the legacy `pack` / `stage` / `difficulty` fields.
 */
export interface ChallengeTaxonomy {
  /** e.g. "Maze", "Warehouse", "Finance". */
  domain?: string;
  /** e.g. "Navigation", "Fulfilment", "Payment Routing". */
  simulation?: string;
  tier?: "tutorial" | "easy" | "medium" | "hard";
  /** Position on the complexity ladder within a tier (1, 5, 10, 20, …). */
  grade?: number;
}

export interface ChallengeData {
  id: string;
  /**
   * Simulation pack this challenge belongs to (e.g. "maze", "warehouse"). The
   * content registry groups challenges by this field — no id-prefix guessing.
   */
  pack: string;
  number: number;
  name: string;
  difficulty: ChallengeLevel;
  /** Presentation grouping within a world-specific learning path. */
  stage?: "practice" | "easy" | "medium" | "hard";
  /** References a key in the worlds registry. */
  worldKey: string;
  /** One-line hook shown on the challenge card. */
  tagline: string;
  /**
   * The story paragraph shown in the authoring panel. Should place the user
   * in a scenario so the objective feels meaningful, not mechanical.
   */
  narrative: string;
  /** Clear statement of what must be achieved to pass. */
  objective: string;
  /** What algorithmic concept this challenge teaches. */
  learningObjective: string;
  /**
   * Plain-English description of the scaffold brain's current intelligence
   * (or lack thereof). Helps the user understand what already exists and
   * what they need to change.
   */
  intelligenceExplanation: string;
  /** A nudge in the right direction without giving the answer. */
  hint: string;
  /**
   * Optional staged hints, revealed one at a time and escalating toward the
   * answer (nudge → worked example → the rule itself). Falls back to `[hint]`.
   */
  hints?: string[];
  /** Brick ids available in the rules palette for this challenge. */
  availableBricks: string[];
  /** Condition flag names available in the condition builder. */
  availableConditions: string[];
  /** Whether the Functions composer tab is unlocked. */
  functionsUnlocked: boolean;
  /**
   * Whether the user may author states. A state only becomes meaningful once a
   * challenge needs two modes, so earlier challenges show them read-only rather
   * than offering a control with no observable effect.
   */
  statesUnlocked?: boolean;
  /** Machine-checked objectives that tick off from the run's outcome. */
  objectives?: ChallengeObjective[];
  /**
   * Server-evaluated interview suite. The suite id is public; scenario inputs
   * remain in a server-only module and are never included in the client bundle.
   */
  interviewEvaluation?: {
    suiteId: string;
    scenarioCount: number;
    passingScore: number;
    /** Marks the guided interview stage that must lead a shared assignment. */
    tutorial?: boolean;
    /** Short contract shown before submission without revealing hidden inputs. */
    rubric: string[];
  };

  // --- Structured brief (Milestone 4) — optional, layered over the free-text
  //     fields above so existing challenges keep working while new ones (and
  //     new simulation types) render the same progressive-disclosure flow. ---

  /** The single-line "what to do", shown first. Falls back to `objective`. */
  brief?: string;
  /** One-line scenario framing shown under the brief. Falls back to `tagline`. */
  context?: string;
  /** The live task checklist. When absent, the required objectives stand in. */
  steps?: TaskStep[];
  /** Catalogue placement (domain/simulation/tier/grade). Falls back to legacy fields. */
  taxonomy?: ChallengeTaxonomy;
  /** The starting brain (partially built or empty). Stored as raw BrainSource JSON. */
  scaffoldBrain: {
    goals: { goals: { id: string; priority: number; description?: string }[] };
    states: { initial: string; states: { id: string; description?: string }[] };
    rules: { rules: unknown[] };
    functions: { functions: { id: string; action?: string; steps?: string[]; description?: string }[] };
    memory: Record<string, unknown>;
  };
}
