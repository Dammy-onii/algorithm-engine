"use client";

import { useMemo, useState } from "react";

import { PageLayout } from "@/features/engine/application/components/PageLayout";
import type { UploadResult } from "@/lib/assessment/files";
import { DEFAULT_RUNTIME_ID, RUNTIMES, getRuntime } from "@/lib/assessment/runtime/registry";
import type { AiPolicy, FileMap } from "@/lib/assessment/types";
import { FileEditor } from "./FileEditor";

interface Created {
  candidatePath: string;
  reviewPath: string;
}

const field =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500";

export function AssessmentAuthorPage() {
  const [title, setTitle] = useState("");
  const [scenario, setScenario] = useState("");
  const [runtimeId, setRuntimeId] = useState(DEFAULT_RUNTIME_ID);
  const [files, setFiles] = useState<FileMap>({});
  const [hiddenTests, setHiddenTests] = useState<FileMap>({});
  const [tab, setTab] = useState<"project" | "hidden">("project");
  const [timeLimit, setTimeLimit] = useState("");
  const [aiPolicy, setAiPolicy] = useState<AiPolicy>("not_allowed");
  const [uploadNote, setUploadNote] = useState<UploadResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  const runtime = getRuntime(runtimeId)!;
  const visibleTests = useMemo(() => Object.keys(files).filter(runtime.isTestFile).length, [files, runtime]);

  function loadExample() {
    const example = runtime.exampleProject();
    setFiles(example.files);
    setHiddenTests(example.hiddenTests);
    setScenario(example.scenario);
    if (!title) setTitle(runtimeId === "react-js" ? "Fix the cart total" : "Fix the word counter");
  }

  function moveToHidden(path: string) {
    const next = { ...files };
    const content = next[path];
    delete next[path];
    setFiles(next);
    setHiddenTests({ ...hiddenTests, [path]: content });
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title, scenario, runtimeId, files, hiddenTests,
          timeLimitMinutes: timeLimit === "" ? null : Number(timeLimit),
          aiPolicy,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not create the assessment.");
      setCreated(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the assessment.");
    } finally {
      setBusy(false);
    }
  }

  if (created) return <CreatedView created={created} />;

  return (
    <PageLayout
      title="New codebase assessment"
      subtitle="Give candidates a real project to explore, fix and extend, in the browser."
      backLabel="Home"
      backHref="/"
      className="max-w-5xl pb-16"
    >
      <div className="space-y-6 px-6 sm:px-10">
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="title">Title</label>
            <input id="title" className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fix the checkout total" />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="scenario">Problem statement or scenario</label>
            <textarea id="scenario" rows={5} className={field} value={scenario} onChange={(e) => setScenario(e.target.value)} placeholder="Describe the situation the candidate is walking into and what you want them to do." />
            <p className="mt-1 text-xs text-zinc-500">Formatting: <code># Heading</code>, <code>## Task</code>, <code>- bullet</code>, <code>&gt; quote</code>, <code>`code`</code>, <code>**bold**</code>.</p>
          </div>
          <div>
            <label className={label} htmlFor="runtime">Stack</label>
            <select id="runtime" className={field} value={runtimeId} onChange={(e) => setRuntimeId(e.target.value)}>
              {RUNTIMES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-zinc-500">{runtime.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="limit">Time limit (minutes)</label>
              <input id="limit" inputMode="numeric" className={field} value={timeLimit} onChange={(e) => setTimeLimit(e.target.value.replace(/\D/g, ""))} placeholder="Untimed" />
            </div>
            <div>
              <label className={label} htmlFor="ai">AI assistants</label>
              <select id="ai" className={field} value={aiPolicy} onChange={(e) => setAiPolicy(e.target.value as AiPolicy)}>
                <option value="not_allowed">Not allowed</option>
                <option value="allowed">Allowed</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 text-sm dark:bg-zinc-800">
              {(["project", "hidden"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-md px-3 py-1 font-medium ${tab === t ? "bg-white shadow-sm dark:bg-zinc-950" : "text-zinc-500"}`}>
                  {t === "project" ? `Project files (${Object.keys(files).length})` : `Hidden tests (${Object.keys(hiddenTests).length})`}
                </button>
              ))}
            </div>
            <button type="button" onClick={loadExample} className="text-sm font-medium text-blue-600 hover:underline">Load an example project</button>
          </div>
          {tab === "project" ? (
            <>
              <FileEditor
                files={files}
                onChange={setFiles}
                onUploaded={setUploadNote}
                isTestFile={runtime.isTestFile}
                moveLabel="→ hidden"
                onMove={moveToHidden}
                emptyHint="Add files or upload a project folder. Test files that candidates can run go here; tests they must not see go in Hidden tests."
              />
              <p className="mt-2 text-xs text-zinc-500">
                {visibleTests} visible test file{visibleTests === 1 ? "" : "s"}. Everything here is sent to the candidate&apos;s browser.
              </p>
              {uploadNote && uploadNote.skipped.length > 0 && (
                <details className="mt-2 text-xs text-zinc-500">
                  <summary className="cursor-pointer">{uploadNote.skipped.length} uploaded file(s) were skipped</summary>
                  <ul className="mt-1 list-disc pl-5 font-mono">
                    {uploadNote.skipped.slice(0, 50).map((s) => <li key={s.path}>{s.path} — {s.reason}</li>)}
                  </ul>
                </details>
              )}
            </>
          ) : (
            <>
              <FileEditor files={hiddenTests} onChange={setHiddenTests} isTestFile={runtime.isTestFile} emptyHint="Hidden tests are never sent to the candidate. They are stored for your review and for the hidden-test runner." />
              <p className="mt-2 text-xs text-zinc-500">Candidates cannot see these files.</p>
            </>
          )}
        </section>

        {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
        <button type="button" onClick={create} disabled={busy} className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">
          {busy ? "Creating…" : "Create assessment"}
        </button>
      </div>
    </PageLayout>
  );
}

function CreatedView({ created }: { created: Created }) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return (
    <PageLayout title="Assessment created" className="max-w-3xl pb-16">
      <div className="space-y-6 px-6 sm:px-10">
        <LinkBox heading="Candidate link" note="Send this to the candidate. It allows one attempt." url={origin + created.candidatePath} />
        <LinkBox heading="Review link (keep private)" note="Anyone with this link can see submissions. Bookmark it; it cannot be recovered." url={origin + created.reviewPath} />
      </div>
    </PageLayout>
  );
}

function LinkBox({ heading, note, url }: { heading: string; note: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
      <h2 className="text-sm font-semibold">{heading}</h2>
      <p className="mt-1 text-xs text-zinc-500">{note}</p>
      <div className="mt-3 flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900" />
        <button type="button" onClick={async () => { await navigator.clipboard.writeText(url).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="rounded-md bg-zinc-900 px-3 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
          {copied ? "Copied" : "Copy"}
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold dark:border-zinc-700">Open</a>
      </div>
    </div>
  );
}
