"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Asks the authoring panel to show a Policy subview (detail: "rules" | "conditions" | "functions"). */
export const SHOW_POLICY_TAB_EVENT = "ctrl:show-policy-tab";

type PolicySubview = "rules" | "conditions" | "functions";

function showPolicyTab(tab: PolicySubview) {
  window.dispatchEvent(new CustomEvent(SHOW_POLICY_TAB_EVENT, { detail: tab }));
}

interface Props {
  includesSubmission: boolean;
  onFinish: () => void;
  /** On narrow screens only one workspace panel is visible; show the step's panel. */
  onShowPanel?: (panel: "build" | "run") => void;
}

interface TourStep {
  /** Matches a `data-tour` attribute on the page. Omit for a centred card. */
  target?: string;
  panel?: "build" | "run";
  /** Policy subview to open before spotlighting the target. */
  policyTab?: PolicySubview;
  title: string;
  body: string;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 12;
const GAP = 12;
const EDGE = 16;
const CARD_WIDTH = 320;

/**
 * On-screen tour of the challenge page. Each step spotlights a real part of the
 * page and explains it in a sentence or two. It never reveals a challenge answer.
 */
export function ChallengeWalkthrough({
  includesSubmission,
  onFinish: finish,
  onShowPanel,
}: Props) {
  const steps = tourSteps(includesSubmission);
  // The tour switches Policy subviews as it goes; leave the learner on Rules.
  const onFinish = useCallback(() => {
    showPolicyTab("rules");
    finish();
  }, [finish]);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [cardHeight, setCardHeight] = useState(180);
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const cardRef = useRef<HTMLDivElement>(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  const next = useCallback(() => {
    if (last) onFinish();
    else setIndex((current) => current + 1);
  }, [last, onFinish]);
  const back = useCallback(() => setIndex((current) => Math.max(0, current - 1)), []);

  // Bring the step's element into view, then keep the spotlight on it while
  // the page or either workspace panel scrolls or resizes.
  useEffect(() => {
    if (step.panel) onShowPanel?.(step.panel);
    if (step.policyTab) showPolicyTab(step.policyTab);
    // Timers rather than animation frames, so the tour still lays out when it
    // opens in a background tab.
    let pending = 0;
    const measure = () => {
      window.clearTimeout(pending);
      pending = window.setTimeout(() => {
        setViewport({ width: window.innerWidth, height: window.innerHeight });
        const element = step.target
          ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
          : null;
        const rect = element?.getBoundingClientRect();
        setBox(
          rect && rect.width > 0 && rect.height > 0
            ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
            : null,
        );
      }, 16);
    };
    // Wait a moment so a tab or panel switch has rendered before scrolling.
    // A section taller than the screen is aligned to its top, not centred.
    const reveal = window.setTimeout(() => {
      const element = step.target
        ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
        : null;
      const tall = (element?.offsetHeight ?? 0) > window.innerHeight * 0.7;
      element?.scrollIntoView({ block: tall ? "start" : "center", behavior: "smooth" });
      measure();
    }, 50);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(pending);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [step.target, step.panel, step.policyTab, onShowPanel]);

  // The card's height changes with its text and width; re-measure so it is
  // placed fully above or below the spotlight.
  useLayoutEffect(() => {
    const height = cardRef.current?.offsetHeight;
    if (height) setCardHeight(height);
  }, [index, viewport.width]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFinish();
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFinish, next, back]);

  const cardWidth = Math.min(CARD_WIDTH, viewport.width - EDGE * 2);
  // The spotlight and card are placed with `transform`, not top/left. Browsers count every
  // frame of an animated top/left as a layout shift (CLS), and the spotlight re-animates on
  // each scroll event while a step scrolls into view: on phones that added up to a CLS of
  // 2-10 on every challenge page. Moves made with transform are not layout shifts.
  let cardPosition: { top: number; left: number; width: number };
  if (box) {
    // Prefer below, then above, then beside the spotlight; a target too large
    // for any of those gets the card tucked inside its top edge.
    const clampTop = (top: number) =>
      Math.min(Math.max(EDGE, top), viewport.height - cardHeight - EDGE);
    const clampLeft = (left: number) =>
      Math.min(Math.max(EDGE, left), viewport.width - cardWidth - EDGE);
    const below = box.top + box.height + PAD + GAP;
    const above = box.top - PAD - GAP - cardHeight;
    const leftSide = box.left - PAD - GAP - cardWidth;
    const rightSide = box.left + box.width + PAD + GAP;
    if (below + cardHeight <= viewport.height - EDGE) {
      cardPosition = { top: below, left: clampLeft(box.left), width: cardWidth };
    } else if (above >= EDGE) {
      cardPosition = { top: above, left: clampLeft(box.left), width: cardWidth };
    } else if (leftSide >= EDGE) {
      cardPosition = { top: clampTop(box.top), left: leftSide, width: cardWidth };
    } else if (rightSide + cardWidth <= viewport.width - EDGE) {
      cardPosition = { top: clampTop(box.top), left: rightSide, width: cardWidth };
    } else {
      cardPosition = {
        top: clampTop(box.top + GAP),
        left: clampLeft(box.left + GAP),
        width: cardWidth,
      };
    }
  } else {
    cardPosition = {
      top: Math.max(EDGE, (viewport.height - cardHeight) / 2),
      left: (viewport.width - cardWidth) / 2,
      width: cardWidth,
    };
  }

  const cardStyle: React.CSSProperties = {
    top: 0,
    left: 0,
    width: cardPosition.width,
    transform: `translate(${cardPosition.left}px, ${cardPosition.top}px)`,
  };

  return (
    <div className="fixed inset-0 z-[70]" role="presentation">
      {/* Clicking anywhere outside the card ends the tour. */}
      <div
        className={`absolute inset-0 ${box ? "" : "bg-zinc-950/60"}`}
        onMouseDown={onFinish}
      />

      {box && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 rounded-xl ring-2 ring-emerald-400 transition-[transform,width,height] duration-300"
          style={{
            transform: `translate(${box.left - PAD}px, ${box.top - PAD}px)`,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(9, 9, 11, 0.6)",
          }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="challenge-walkthrough-title"
        className="absolute rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl transition-transform duration-300 dark:border-zinc-700 dark:bg-[#181818]"
        style={cardStyle}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-zinc-500">
            {index + 1} of {steps.length}
          </span>
          <button
            type="button"
            onClick={onFinish}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            Skip tour
          </button>
        </div>
        <h2
          id="challenge-walkthrough-title"
          className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-100"
        >
          {step.title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{step.body}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={back}
            disabled={index === 0}
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Back
          </button>
          <button
            type="button"
            autoFocus
            onClick={next}
            className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {last ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

function tourSteps(includesSubmission: boolean): TourStep[] {
  const steps: TourStep[] = [
    {
      target: "task",
      panel: "build",
      title: "This is your task",
      body: "This line tells you what to do in one sentence.",
    },
    {
      target: "problem",
      panel: "build",
      title: "Read the problem",
      body: "This explains the situation and what you need to build. Read it before you add any rules.",
    },
    {
      target: "hint",
      panel: "build",
      title: "Stuck? Get a hint",
      body: "Click here for a hint. Each click gives you a bit more help.",
    },
    {
      target: "add-rule",
      panel: "build",
      policyTab: "rules",
      title: "Add a rule",
      body: "A rule says: WHEN something is true, DO something. Rules are checked from the top, and the first true rule wins.",
    },
    {
      target: "policy-panel",
      panel: "build",
      policyTab: "conditions",
      title: "Conditions",
      body: "Conditions are the facts you can check in the WHEN part of a rule. Each one is listed here with what it means.",
    },
    {
      target: "policy-panel",
      panel: "build",
      policyTab: "functions",
      title: "Functions",
      body: "Functions are the actions you can use in the DO part of a rule. Each one is listed here with what it does.",
    },
    {
      target: "apply-run",
      title: "Run your rules",
      body: "Click Apply & Run to try your rules.",
    },
    {
      target: "simulation",
      panel: "run",
      title: "Watch it happen",
      body: "Your rules play out here, one step at a time. When the run ends, the results show what passed.",
    },
  ];

  if (includesSubmission) {
    steps.push({
      title: "Submit your solution",
      body: "When you are ready, use Submit solution. It tests your rules on new cases you have not seen. Apply & Run is only for practice.",
    });
  }

  steps.push({
    target: "guide",
    title: "Need this again?",
    body: "Click Guide any time to replay this tour.",
  });

  return steps;
}
