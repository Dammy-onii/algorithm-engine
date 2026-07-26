"use client";

import { useMemo, useState } from "react";

import type { ChallengeData } from "@/lib/authoring/types";
import { difficultyFor } from "@/features/catalogue/difficulty";
import {
  compareInterviewChallenges,
  isInterviewTutorial,
} from "@/lib/interview/assignmentOrder";
import { copyText } from "@/shared/browser/copyText";

interface AssignmentResponse {
  path?: string;
  challengeIds?: string[];
  error?: string;
}

export function InterviewAssignmentBuilder({
  challenges,
}: {
  challenges: ChallengeData[];
}) {
  const orderedChallenges = useMemo(
    () => [...challenges].sort(compareInterviewChallenges),
    [challenges],
  );
  const tutorialIds = useMemo(
    () =>
      orderedChallenges
        .filter(isInterviewTutorial)
        .map((challenge) => challenge.id),
    [orderedChallenges],
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(tutorialIds),
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleChallenge = (challenge: ChallengeData) => {
    if (isInterviewTutorial(challenge)) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(challenge.id)) next.delete(challenge.id);
      else next.add(challenge.id);
      return next;
    });
    setShareUrl(null);
    setCopied(false);
    setError(null);
  };

  const createLink = async () => {
    setCreating(true);
    setError(null);
    setShareUrl(null);
    setCopied(false);

    try {
      const response = await fetch("/api/interview/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeIds: Array.from(selectedIds) }),
      });
      const result = (await response.json()) as AssignmentResponse;
      if (!response.ok || !result.path) {
        throw new Error(result.error ?? "Could not create the interview link.");
      }

      const url = `${window.location.origin}${result.path}`;
      setShareUrl(url);
      setCopied(await copyText(url));
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : "Could not create the interview link.",
      );
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    setCopied(await copyText(shareUrl));
  };

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
            Interview assignment
          </p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Select problems to share
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {tutorialIds.length > 0
              ? "The marked interview tutorial is included first. "
              : ""}
            Every published level in this world is available. Selected problems
            are sent in ascending difficulty, regardless of selection order.
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-emerald-200 bg-white/70 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-black/15 dark:text-emerald-300">
          {selectedIds.size} selected
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {orderedChallenges.map((challenge, index) => {
          const tutorial = isInterviewTutorial(challenge);
          const selected = selectedIds.has(challenge.id);
          const difficulty = difficultyFor(challenge);

          return (
            <label
              key={challenge.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                selected
                  ? "border-emerald-400 bg-white dark:border-emerald-700 dark:bg-zinc-900"
                  : "border-emerald-200/80 bg-white/45 hover:bg-white dark:border-emerald-900/60 dark:bg-zinc-950/20 dark:hover:bg-zinc-900"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                disabled={tutorial}
                onChange={() => toggleChallenge(challenge)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-emerald-600 disabled:opacity-70"
              />
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  {tutorial
                    ? "Tutorial · first"
                    : `${index + 1}. ${difficulty}`}
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {challenge.name}
                </span>
                <span className="mt-1 block text-[11px] text-zinc-500 dark:text-zinc-400">
                  {challenge.interviewEvaluation
                    ? `${challenge.interviewEvaluation.scenarioCount} hidden submission cases`
                    : "Visible stage evaluation"}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={createLink}
          disabled={creating || selectedIds.size === 0}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25"
        >
          {creating ? "Creating…" : "Create short interview link"}
        </button>

        {shareUrl && (
          <div className="flex min-w-0 flex-1 gap-2">
            <input
              value={shareUrl}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              aria-label="Generated interview assignment link"
              className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-xs text-zinc-700 outline-none focus:border-emerald-500 dark:border-emerald-900 dark:bg-zinc-900 dark:text-zinc-200"
            />
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-zinc-900 dark:text-emerald-300"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
