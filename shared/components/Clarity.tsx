"use client";

import { useEffect } from "react";
import clarity from "@microsoft/clarity";

import { applyConsent, readConsent } from "@/shared/analytics/consent";

/**
 * Microsoft Clarity — session replay + heatmaps for understanding how people use
 * the platform and work through interview problems.
 *
 * Uses the official @microsoft/clarity package (clarity.init) rather than the raw
 * tag, so we also have its typed helpers (clarity.event / setTag / identify) ready
 * for tagging test-specific events later.
 *
 * The project id is public (it ships in the browser tag regardless), so it is baked
 * in as a default; NEXT_PUBLIC_CLARITY_PROJECT_ID can override it if the project ever
 * changes. Tracking is limited to production so local dev sessions don't pollute the
 * analytics. init must run in the browser, hence the client component + effect.
 *
 * Clarity masks text and form inputs by default, so candidate keystrokes inside the
 * interview flow are not captured as readable content.
 */
const DEFAULT_PROJECT_ID = "yje9n21cxy";

export function Clarity() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    const projectId =
      process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || DEFAULT_PROJECT_ID;
    if (!projectId) return;
    clarity.init(projectId);
    // Re-send a remembered cookie choice so sessions stitch across page loads.
    const choice = readConsent();
    if (choice) applyConsent(choice);
  }, []);

  return null;
}
