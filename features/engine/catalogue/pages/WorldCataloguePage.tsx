import Link from "next/link";

import { PageLayout } from "@/features/engine/application/components/PageLayout";
import { CODE_PROBLEMS } from "@/lib/assessment/problems";
import { getRuntime } from "@/lib/assessment/runtime/registry";
import { listPacks } from "@/lib/content/registry";

/** Complete UI for the `/app` route — the scenario catalogue. */
export function WorldCataloguePage() {
  const packs = listPacks();

  return (
    <PageLayout title="CTRL" titleHref="/" className=" w-full max-w-none">
      <section className="mx-auto flex w-full max-w-none flex-col gap-10 px-6 py-10 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-5">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-40">
              Problems
            </p>
            <h1 className="mt-3 text-3xl font-medium tracking-[-0.02em] text-ink sm:text-4xl dark:text-zinc-50">
              Pick a problem to solve.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-60 dark:text-zinc-400">
              Each is a live operational world with a clear goal. Open one, design the
              decision logic, and watch how it performs.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-800">
            {packs.map((world) => (
              <Link
                key={world.id}
                href={`/${world.id}`}
                className="group flex min-h-56 flex-col items-start bg-paper p-6 text-left transition-colors hover:bg-line-soft dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
              >
                <span className="font-mono text-[11px] uppercase tracking-wide text-ink-40">
                  {world.eyebrow}
                </span>
                <span className="mt-2 text-2xl font-medium text-ink dark:text-zinc-100">
                  {world.title}
                </span>
                <span className="mt-3 text-sm leading-relaxed text-ink-60 dark:text-zinc-400">
                  {world.description}
                </span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-medium text-ink transition-transform group-hover:translate-x-0.5 dark:text-zinc-100">
                  {world.action} <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-40">
              Code assessments
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.02em] text-ink sm:text-4xl dark:text-zinc-50">
              Fix a real codebase.
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-60 dark:text-zinc-400">
              Each problem is a small project with something wrong in it. Read the
              brief, find the fault, fix it in the browser, and run the tests.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-800">
            {CODE_PROBLEMS.map((problem) => (
              <Link
                key={problem.id}
                href={`/app/code/${problem.id}`}
                className="group flex min-h-48 flex-col items-start bg-paper p-6 text-left transition-colors hover:bg-line-soft dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
              >
                <span className="font-mono text-[11px] uppercase tracking-wide text-ink-40">
                  {problem.level} · {getRuntime(problem.runtimeId)?.label}
                </span>
                <span className="mt-2 text-xl font-medium text-ink dark:text-zinc-100">
                  {problem.title}
                </span>
                <span className="mt-3 text-sm leading-relaxed text-ink-60 dark:text-zinc-400">
                  {problem.summary}
                </span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-medium text-ink transition-transform group-hover:translate-x-0.5 dark:text-zinc-100">
                  Open problem <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
