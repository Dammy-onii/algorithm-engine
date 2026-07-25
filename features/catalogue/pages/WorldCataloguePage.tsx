import Link from "next/link";

import { PageLayout } from "@/features/application/components/PageLayout";
import { listPacks } from "@/lib/content/registry";

/** Complete UI for the `/` route. */
export function WorldCataloguePage() {
  const packs = listPacks();

  return (
    <PageLayout title="Algorithm Engine" className=" w-full max-w-none">
      <section className="mx-auto flex w-full max-w-none flex-col gap-8 px-20 py-10">
        <div className="w-full">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Algorithm Engine
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Choose a simulation world
          </h1>
          <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Each world teaches a different kind of algorithm. Choose the
            environment in which you want to build an agent.
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
      </section>
    </PageLayout>
  );
}
