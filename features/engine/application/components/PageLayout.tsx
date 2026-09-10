import type { ReactNode } from "react";
import Link from "next/link";

import { ThemeToggle } from "@/shared/components/ThemeToggle";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  backLabel?: string;
  backHref?: string;
  action?: { label: string; href: string };
  className?: string;
  children: ReactNode;
}

// Pill button in the landing's style; dark variants keep the app's dark mode.
const actionClass =
  "rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink-60 transition hover:border-ink/40 hover:text-ink dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100";

/** Shared visual frame; route-specific UI and state remain in feature pages. */
export function PageLayout({
  title,
  subtitle,
  backLabel,
  backHref,
  action,
  className,
  children,
}: PageLayoutProps) {
  return (
    <main
      className={[
        "mx-auto flex min-h-full w-full flex-col gap-6 ",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10 lg:px-16">
        <div>
          {backLabel && backHref ? (
            <Link
              href={backHref}
              className="font-mono text-xs text-ink-40 transition hover:text-ink dark:hover:text-zinc-100"
            >
              ← {backLabel}
            </Link>
          ) : null}
          <h1
            className={[
              "text-2xl font-medium tracking-[-0.02em] text-ink dark:text-zinc-50",
              backLabel ? "mt-1" : "",
            ].join(" ")}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-ink-40">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {action ? (
            <Link href={action.href} className={actionClass}>
              {action.label}
            </Link>
          ) : null}
          <ThemeToggle />
        </div>
      </header>
      {children}
    </main>
  );
}
