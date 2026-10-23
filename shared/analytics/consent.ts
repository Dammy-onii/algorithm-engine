import clarity from "@microsoft/clarity";

/**
 * Cookie consent for analytics (Microsoft Clarity).
 *
 * Clarity stitches page views into one session with first-party cookies
 * (`_clck`, `_clsk`). Without a consent signal it holds those cookies back for
 * EEA / UK / Swiss visitors, so each page load becomes its own short recording.
 * The visitor's choice is stored locally and re-sent to Clarity on every load.
 *
 * Analytics only: ad storage is always denied — CTRL runs no advertising.
 */

export type ConsentChoice = "granted" | "denied";

const STORAGE_KEY = "ctrl-cookie-consent";

export function readConsent(): ConsentChoice | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

/** Tell Clarity the visitor's choice. A no-op when Clarity is not loaded. */
export function applyConsent(choice: ConsentChoice): void {
  try {
    clarity.consentV2({ analytics_Storage: choice, ad_Storage: "denied" });
  } catch {
    // Clarity not initialised (dev / blocked) — nothing to signal.
  }
}

export function saveConsent(choice: ConsentChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Storage unavailable (private mode) — the choice still applies this visit.
  }
  applyConsent(choice);
}
