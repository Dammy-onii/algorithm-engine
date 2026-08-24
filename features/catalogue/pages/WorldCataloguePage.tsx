import Link from "next/link";

import { PageLayout } from "@/features/application/components/PageLayout";
import { listPacks } from "@/lib/content/registry";

/** Complete UI for the `/` route. */
export function WorldCataloguePage() {
  const packs = listPacks();

  return (
    <PageLayout title="CTRL" className=" w-full max-w-none">
      <section className="mx-auto flex w-full max-w-none flex-col gap-12 px-20 py-10">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            Technical assessments built around real work
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
            See how candidates would keep operations moving.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
            CTRL is a technical assessment platform where applicants solve realistic
            scenarios based on your company&apos;s work. See how they think, what they
            prioritise, and how their solution performs before you commit to another
            interview.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Assessment scenarios
            </h2>
            <p className="mt-2 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Each scenario is a live operational problem. Open one to design the
              decision logic and watch how it performs.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {packs.map((world) => (
            <Link
              key={world.id}
              href={`/${world.id}`}
              className="flex min-h-56 flex-col items-start rounded-xl border border-zinc-200 bg-white p-5 text-left transition-colors hover:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-500"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                {world.eyebrow}
              </span>
              <span className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {world.title}
              </span>
              <span className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {world.description}
              </span>
              <span className="mt-auto pt-6 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {world.action} →
              </span>
            </Link>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
