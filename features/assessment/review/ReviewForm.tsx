"use client";

import { useState } from "react";

import type { Recommendation, Review, RubricCriterion } from "@/lib/assessment/types";

export function ReviewForm({ token, sessionId, rubric, initial }: {
  token: string; sessionId: string; rubric: RubricCriterion[]; initial?: Review;
}) {
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(initial?.scores ?? {}).map(([k, v]) => [k, String(v)])),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [recommendation, setRecommendation] = useState<Recommendation | "">(initial?.recommendation ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setState("saving"); setError(null);
    const response = await fetch(`/api/review/${token}/${sessionId}`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ scores, notes, recommendation: recommendation || null }),
    });
    if (response.ok) setState("saved");
    else { setState("error"); setError((await response.json().catch(() => ({}))).error ?? "Could not save."); }
  }

  const total = rubric.reduce((sum, c) => sum + (Number(scores[c.id]) || 0), 0);
  const max = rubric.reduce((sum, c) => sum + c.maxScore, 0);

  return (
    <section aria-label="Review" className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Your review</h2>
        <span className="font-mono text-sm">{total} / {max}</span>
      </div>
      <div className="mt-3 space-y-3">
        {rubric.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-4">
            <label htmlFor={`score-${c.id}`} className="text-sm">
              <span className="font-medium">{c.label}</span>
              {c.description && <span className="block text-xs text-zinc-500">{c.description}</span>}
            </label>
            <div className="flex shrink-0 items-center gap-1 text-sm">
              <input id={`score-${c.id}`} inputMode="numeric" value={scores[c.id] ?? ""} onChange={(e) => setScores({ ...scores, [c.id]: e.target.value.replace(/\D/g, "") })} className="w-12 rounded border border-zinc-300 bg-white px-2 py-1 text-right dark:border-zinc-700 dark:bg-zinc-900" />
              <span className="text-zinc-500">/ {c.maxScore}</span>
            </div>
          </div>
        ))}
      </div>
      <textarea aria-label="Notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for your team" className="mt-4 w-full rounded-md border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select aria-label="Recommendation" value={recommendation} onChange={(e) => setRecommendation(e.target.value as Recommendation | "")} className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <option value="">No recommendation</option>
          <option value="advance">Advance</option>
          <option value="hold">Hold</option>
          <option value="reject">Reject</option>
        </select>
        <button type="button" onClick={save} disabled={state === "saving"} className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">
          {state === "saving" ? "Saving…" : "Save review"}
        </button>
        {state === "saved" && <span className="text-sm text-green-600">Saved</span>}
        {error && <span role="alert" className="text-sm text-rose-600">{error}</span>}
      </div>
    </section>
  );
}
