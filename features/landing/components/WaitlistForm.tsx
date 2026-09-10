"use client";

import { useId, useState, type FormEvent } from "react";

/**
 * Posts each signup to a Google Apps Script web app, which appends a row to a
 * Google Sheet (free, effectively unlimited storage).
 *
 * The endpoint is hardcoded below, not read only from an env var, on purpose:
 * `process.env.NEXT_PUBLIC_*` is inlined at BUILD time, so a value present in a
 * local `.env.local` is absent from a bundle a host builds without it — which is
 * why the form worked on localhost but did nothing once deployed. The Apps Script
 * /exec URL is public by design (access = Anyone), so it is safe to ship in the
 * client. NEXT_PUBLIC_WAITLIST_ENDPOINT still overrides it when set, so you can point at
 * a new deployment without editing code.
 *
 * Apps Script responses carry no CORS headers, so we send the request as a
 * "simple" POST (text/plain, no preflight) with mode: "no-cors". The row is
 * written server-side even though the browser hands us an opaque response, so a
 * request that resolves is treated as success.
 */
const DEFAULT_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyeKskgztwOgoVbTdP2LLAFIrxUkwyxwROlbQu7BR8P9gusjWgI1bznXk9q3yeG0ibZ/exec";

const ENDPOINT =
  (process.env.NEXT_PUBLIC_WAITLIST_ENDPOINT as string | undefined) || DEFAULT_ENDPOINT;

type Status = "idle" | "loading" | "done" | "error";

interface WaitlistFormProps {
  tone?: "light" | "dark";
  source?: string;
  companyPlaceholder?: string;
  rolePlaceholder?: string;
  submitLabel?: string;
  note?: string;
}

export function WaitlistForm({
  tone = "light",
  source = "landing",
  companyPlaceholder = "Company",
  rolePlaceholder = "Roles you hire for",
  submitLabel = "Request early access",
  note = "Company and role are optional. No spam, ever.",
}: WaitlistFormProps) {
  const uid = useId();
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const onDark = tone === "light"; // form sits on the dark hero

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");

    const payload = {
      email: email.trim().toLowerCase(),
      company: company.trim(),
      role: role.trim(),
      source,
    };

    const body = JSON.stringify(payload);

    try {
      // Prefer sendBeacon: it hands the POST to the browser to deliver and never
      // exposes Apps Script's 302 -> googleusercontent "echo" redirect to our
      // code, so a broken/missing echo response can't abort or hang the request.
      // doPost still runs server-side. Falls back to a no-cors fetch when the
      // browser has no sendBeacon (or refuses to queue it).
      const beacon =
        typeof navigator !== "undefined" && "sendBeacon" in navigator
          ? navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain;charset=utf-8" }))
          : false;

      if (!beacon) {
        await fetch(ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body,
        });
      }

      // The response is unreadable either way (no CORS headers), so a request
      // that fired without throwing is treated as success. Whether the row was
      // actually written depends on the Apps Script deployment being reachable
      // by anonymous visitors (access = "Anyone") — confirm in the Sheet.
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-sm ${
          onDark ? "bg-white/15 text-white backdrop-blur" : "bg-ink text-white"
        }`}
      >
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-volt text-ink">
          <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
            <path
              d="M2 6.2 4.6 8.8 10 3.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        You&apos;re on the list. We&apos;ll be in touch when your cohort opens.
      </div>
    );
  }

  const field = onDark
    ? "bg-white/5 text-white placeholder:text-white/45 focus:bg-white/10"
    : "bg-black/[0.04] text-ink placeholder:text-ink-40 focus:bg-black/[0.07]";

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md">
      <div
        className={`flex flex-col gap-2 rounded-2xl border p-2 transition-colors duration-300 ${
          onDark
            ? "border-transparent bg-white/10 backdrop-blur-sm hover:border-volt/60 focus-within:border-volt"
            : "border-transparent bg-paper/90 hover:border-signal/50 focus-within:border-signal"
        }`}
      >
        <label htmlFor={`${uid}-email`} className="sr-only">
          Work email
        </label>
        <input
          id={`${uid}-email`}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Work email"
          className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition ${field}`}
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label htmlFor={`${uid}-company`} className="sr-only">
            Company
          </label>
          <input
            id={`${uid}-company`}
            type="text"
            name="company"
            autoComplete="organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder={companyPlaceholder}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition ${field}`}
          />
          <label htmlFor={`${uid}-role`} className="sr-only">
            {rolePlaceholder}
          </label>
          <input
            id={`${uid}-role`}
            type="text"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder={rolePlaceholder}
            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition ${field}`}
          />
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className={`w-full rounded-xl px-5 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
            onDark ? "bg-white text-ink hover:bg-volt" : "bg-ink text-white hover:bg-ink/85"
          }`}
        >
          {status === "loading" ? "Requesting…" : submitLabel}
        </button>
      </div>
      <p
        className={`mt-3 font-mono text-[11px] tracking-wide ${
          onDark ? "text-white/50" : "text-ink-40"
        }`}
      >
        {status === "error" ? "Something went wrong — try again in a moment." : note}
      </p>
    </form>
  );
}
