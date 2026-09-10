"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { WaitlistForm } from "./WaitlistForm";

type Tab = "individual" | "company";
type Mode = "login" | "signup";

/**
 * Login / sign-up surface. Individual accounts aren't wired to an auth backend
 * yet, so that path is an honest placeholder that sends people into the app
 * (problems are open without an account). The company path captures early access
 * through the working waitlist form.
 */
export function LoginForm({ defaultTab = "individual" }: { defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [mode, setMode] = useState<Mode>("signup");
  const [submitted, setSubmitted] = useState(false);
  const emailId = useId();
  const pwId = useId();

  function onIndividualSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {/* audience tabs */}
      <div className="flex rounded-full border border-line p-1">
        {(["individual", "company"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setSubmitted(false);
            }}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === t ? "bg-ink text-white" : "text-ink-60 hover:text-ink"
            }`}
          >
            {t === "individual" ? "Individual" : "Company"}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-card border border-line bg-white p-6 sm:p-8">
        {tab === "individual" ? (
          submitted ? (
            <div className="text-center">
              <h2 className="text-xl font-medium">Accounts are coming soon</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-60">
                Individual sign-in is rolling out shortly. You don&apos;t need an account to start —
                open the app and try any problem right now.
              </p>
              <Link
                href="/app"
                className="mt-6 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-ink/85"
              >
                Open the app →
              </Link>
            </div>
          ) : (
            <>
              <div className="flex gap-4 text-sm">
                {(["login", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`border-b-2 pb-1 font-medium transition ${
                      mode === m
                        ? "border-ink text-ink"
                        : "border-transparent text-ink-40 hover:text-ink"
                    }`}
                  >
                    {m === "login" ? "Log in" : "Sign up"}
                  </button>
                ))}
              </div>

              <form onSubmit={onIndividualSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor={emailId} className="text-sm font-medium">
                    Email
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="mt-1.5 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none transition focus:border-ink/40"
                  />
                </div>
                <div>
                  <label htmlFor={pwId} className="text-sm font-medium">
                    Password
                  </label>
                  <input
                    id={pwId}
                    type="password"
                    required
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder="••••••••"
                    className="mt-1.5 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none transition focus:border-ink/40"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-ink/85"
                >
                  {mode === "login" ? "Log in" : "Create account"}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-ink-40">
                No account yet? You can{" "}
                <Link href="/app" className="text-ink underline underline-offset-2">
                  try problems without one
                </Link>
                .
              </p>
            </>
          )
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-medium">Company sign-in</h2>
              <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] tracking-wide text-ink-40 uppercase">
                Coming soon
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-60">
              Company accounts are still in early access — sign-in isn&apos;t open yet. Request
              access and tell us the roles you hire for, and we&apos;ll set your team up directly.
            </p>
            <div className="mt-6">
              <WaitlistForm tone="dark" />
            </div>
            <p className="mt-4 text-xs text-ink-40">
              Want the full picture first?{" "}
              <Link href="/companies" className="text-ink underline underline-offset-2">
                See CTRL for companies
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
