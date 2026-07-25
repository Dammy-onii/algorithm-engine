"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ChallengeData } from "@/lib/authoring/types";
import type { PackInfo } from "@/lib/content/registry";
import Link from "next/link";

import { PageLayout } from "@/features/application/components/PageLayout";
import {
  difficultyFor,
  type DifficultyBand,
} from "@/features/catalogue/difficulty";
import { conceptForChallenge } from "@/lib/curriculum/concepts";
import { taxonomyFor } from "@/lib/authoring/challengeBrief";

type CompletionFilter = "solved" | "unsolved";

const DIFFICULTY_LABEL: Record<DifficultyBand, string> = {
  example: "Example",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

interface ChallengeDirectoryPageProps {
  pack: PackInfo;
  challenges: ChallengeData[];
}

/** Complete UI for a validated `/[pack]` route. */
export function ChallengeDirectoryPage({
  pack,
  challenges,
}: ChallengeDirectoryPageProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [completionFilters, setCompletionFilters] = useState<
    CompletionFilter[]
  >([]);
  const [difficultyFilters, setDifficultyFilters] = useState<DifficultyBand[]>(
    [],
  );
  const [skillFilters, setSkillFilters] = useState<string[]>([]);
  const [subdomainFilters, setSubdomainFilters] = useState<string[]>([]);

  useEffect(() => {
    const completed = new Set<string>();
    for (const challenge of challenges) {
      try {
        if (localStorage.getItem(`ae-complete-${challenge.id}`) === "true") {
          completed.add(challenge.id);
        }
      } catch {
        break;
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompletedIds(completed);
  }, [challenges]);

  const skills = useMemo(
    () =>
      Array.from(
        new Set(
          challenges
            .map((challenge) => conceptForChallenge(challenge.id)?.name)
            .filter((skill): skill is string => Boolean(skill)),
        ),
      ),
    [challenges],
  );
  const subdomains = useMemo(
    () =>
      Array.from(
        new Set(
          challenges.map((challenge) => taxonomyFor(challenge).simulation),
        ),
      ),
    [challenges],
  );

  const filteredChallenges = challenges.filter((challenge) => {
    const solved = completedIds.has(challenge.id);
    const difficulty = difficultyFor(challenge);
    const skill = conceptForChallenge(challenge.id)?.name;
    const subdomain = taxonomyFor(challenge).simulation;

    if (
      completionFilters.length > 0 &&
      !completionFilters.includes(solved ? "solved" : "unsolved")
    ) {
      return false;
    }
    if (
      difficultyFilters.length > 0 &&
      !difficultyFilters.includes(difficulty)
    ) {
      return false;
    }
    if (skillFilters.length > 0 && (!skill || !skillFilters.includes(skill))) {
      return false;
    }
    if (subdomainFilters.length > 0 && !subdomainFilters.includes(subdomain)) {
      return false;
    }
    return true;
  });

  const examples = filteredChallenges.filter(
    (challenge) => difficultyFor(challenge) === "example",
  );
  const remaining = filteredChallenges.filter(
    (challenge) => difficultyFor(challenge) !== "example",
  );
  const filtersActive =
    completionFilters.length +
      difficultyFilters.length +
      skillFilters.length +
      subdomainFilters.length >
    0;

  const toggleFilter = <T extends string>(
    value: T,
    selected: T[],
    setSelected: (next: T[]) => void,
  ) => {
    setSelected(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  const clearFilters = () => {
    setCompletionFilters([]);
    setDifficultyFilters([]);
    setSkillFilters([]);
    setSubdomainFilters([]);
  };

  return (
    <PageLayout
      title={pack.title}
      backLabel="All worlds"
      backHref="/"
      action={{ label: "Lab", href: "/lab" }}
      className=" w-full "
    >
      <section className="mx-auto flex w-full flex-col gap-8 px-4 py-4 sm:px-8 lg:px-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            {pack.title} world
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Choose a challenge
          </h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Difficulty reflects the reasoning constraints in each challenge, not
            simply the size of its simulation.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-6">
          <div className="flex min-w-0 flex-col gap-6 col-span-4">
            {examples.length > 0 && (
              <section aria-labelledby={`${pack.id}-example`}>
                <div className="border-b border-zinc-200 pb-3 dark:border-zinc-800">
                  <h3
                    id={`${pack.id}-example`}
                    className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
                  >
                    Examples
                  </h3>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {examples.map((challenge) => (
                    <ChallengeRow
                      key={challenge.id}
                      packId={pack.id}
                      challenge={challenge}
                    />
                  ))}
                </div>
              </section>
            )}

            {remaining.length > 0 && (
              <div className="flex flex-col gap-3">
                {remaining.map((challenge) => (
                  <ChallengeRow
                    key={challenge.id}
                    packId={pack.id}
                    challenge={challenge}
                  />
                ))}
              </div>
            )}

            {filteredChallenges.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  No challenges match these filters.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 text-sm font-semibold text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          <aside className=" col-span-2 order-first rounded-xl border border-zinc-200 bg-white p-5 lg:order-last lg:sticky lg:top-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Filter challenges
              </h3>
              {filtersActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Clear
                </button>
              )}
            </div>

            <FilterSection title="Status">
              <FilterOption
                label="Solved"
                checked={completionFilters.includes("solved")}
                onChange={() =>
                  toggleFilter(
                    "solved",
                    completionFilters,
                    setCompletionFilters,
                  )
                }
              />
              <FilterOption
                label="Unsolved"
                checked={completionFilters.includes("unsolved")}
                onChange={() =>
                  toggleFilter(
                    "unsolved",
                    completionFilters,
                    setCompletionFilters,
                  )
                }
              />
            </FilterSection>

            <FilterSection title="Skills">
              {skills.map((skill) => (
                <FilterOption
                  key={skill}
                  label={skill}
                  checked={skillFilters.includes(skill)}
                  onChange={() =>
                    toggleFilter(skill, skillFilters, setSkillFilters)
                  }
                />
              ))}
            </FilterSection>

            <FilterSection title="Difficulty">
              {(["example", "easy", "medium", "hard"] as DifficultyBand[]).map(
                (difficulty) => (
                  <FilterOption
                    key={difficulty}
                    label={DIFFICULTY_LABEL[difficulty]}
                    checked={difficultyFilters.includes(difficulty)}
                    onChange={() =>
                      toggleFilter(
                        difficulty,
                        difficultyFilters,
                        setDifficultyFilters,
                      )
                    }
                  />
                ),
              )}
            </FilterSection>

            <FilterSection title="Subdomains">
              {subdomains.map((subdomain) => (
                <FilterOption
                  key={subdomain}
                  label={subdomain}
                  checked={subdomainFilters.includes(subdomain)}
                  onChange={() =>
                    toggleFilter(
                      subdomain,
                      subdomainFilters,
                      setSubdomainFilters,
                    )
                  }
                />
              ))}
            </FilterSection>
          </aside>
        </div>
      </section>
    </PageLayout>
  );
}

function ChallengeRow({
  packId,
  challenge,
}: {
  packId: string;
  challenge: ChallengeData;
}) {
  const band = difficultyFor(challenge);
  const difficultyColor: Record<DifficultyBand, string> = {
    example: "text-zinc-500",
    easy: "text-emerald-600 dark:text-emerald-400",
    medium: "text-amber-600 dark:text-amber-400",
    hard: "text-red-600 dark:text-red-400",
  };

  return (
      <Link
        href={`/${packId}/${challenge.id}`}
        className="group flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white px-5 py-5 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 md:flex-row md:items-center md:justify-between md:px-7 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/70 dark:focus-visible:ring-zinc-100"
      >
        <div className="min-w-0">
          <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {challenge.name}
          </h4>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
            <span className={`font-semibold ${difficultyColor[band]}`}>
              {DIFFICULTY_LABEL[band]}
            </span>
          </p>
          <p className="mt-1 text-sm text-zinc-500">{challenge.tagline}</p>
        </div>
        <span className="w-full shrink-0 rounded-lg border border-zinc-400 px-5 py-2.5 text-center text-sm font-medium text-zinc-700 transition-colors group-hover:border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white md:w-auto md:min-w-40 dark:border-zinc-600 dark:text-zinc-200 dark:group-hover:border-zinc-100 dark:group-hover:bg-zinc-100 dark:group-hover:text-zinc-900">
          Open challenge
        </span>
      </Link>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="mt-5 border-t border-zinc-200 pt-5 dark:border-zinc-800">
      <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {title}
      </legend>
      <div className="flex flex-col gap-2.5">{children}</div>
    </fieldset>
  );
}

function FilterOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-zinc-900 dark:border-zinc-700 dark:accent-zinc-100"
      />
      <span>{label}</span>
    </label>
  );
}
