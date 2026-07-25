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

const actionClass =
  "rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100";

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
      <header className="flex items-center justify-between gap-4 px-20 py-6">
        <div>
          {backLabel && backHref ? (
            <Link
              href={backHref}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ← {backLabel}
            </Link>
          ) : null}
          <h1
            className={[
              "text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50",
              backLabel ? "mt-1" : "",
            ].join(" ")}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
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
