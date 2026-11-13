"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useSandpack,
} from "@codesandbox/sandpack-react";

import { boilerplateTemplate, getRuntime } from "@/lib/assessment/runtime/registry";
import type { FileMap, PublicAssessment } from "@/lib/assessment/types";
import { Brief } from "./Brief";
import { collectProjectFiles } from "./collect";
import { WorkspaceShell } from "./WorkspaceShell";

interface SessionView {
  sessionId: string;
  startedAt: number;
  deadline: number | null;
  files: FileMap;
  resumed?: boolean;
}

type Stage = "loading" | "intro" | "working" | "submitted" | "blocked";

const AUTOSAVE_MS = 10_000;
const storageKey = (token: string) => `ctrl-assessment-session:${token}`;
const field = "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

async function api<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json" } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error ?? "Request failed."), { code: body.code as string | undefined });
  return body as T;
}

export function AssessmentWorkspace({ token, assessment }: { token: string; assessment: PublicAssessment }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [session, setSession] = useState<SessionView | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [late, setLate] = useState(false);

  // Resume automatically when this browser already holds a session for the link.
  useEffect(() => {
    async function resume() {
      const saved = localStorage.getItem(storageKey(token));
      if (!saved) { setStage("intro"); return; }
      try {
        const view = await api<SessionView>(`/api/assessments/${token}/sessions`, { method: "POST", body: JSON.stringify({ sessionId: saved }) });
        setSession(view);
        setStage("working");
      } catch (error) {
        const e = error as Error & { code?: string };
        if (e.code === "already_submitted") setStage("submitted");
        else if (e.code === "link_used") { setMessage(e.message); setStage("blocked"); }
        else setStage("intro");
      }
    }
    void resume();
  }, [token]);

  async function start(name: string, email: string) {
    const view = await api<SessionView>(`/api/assessments/${token}/sessions`, { method: "POST", body: JSON.stringify({ name, email }) });
    localStorage.setItem(storageKey(token), view.sessionId);
    setSession(view);
    setStage("working");
  }

  if (stage === "loading") return <Centered><p className="text-sm text-zinc-500">Loading…</p></Centered>;
  if (stage === "blocked") return <Centered><h1 className="text-lg font-semibold">This link can&apos;t be used</h1><p className="mt-2 text-sm text-zinc-500">{message}</p></Centered>;
  if (stage === "submitted") return <Done late={late} />;
  if (stage === "intro" || !session) return <Intro assessment={assessment} onStart={start} />;
  return (
    <Working
      token={token}
      assessment={assessment}
      session={session}
      onSubmitted={(isLate) => { setLate(isLate); setStage("submitted"); }}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">{children}</main>;
}

function Done({ late }: { late: boolean }) {
  return (
    <Centered>
      <h1 className="text-xl font-semibold">Submitted. Thank you!</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Your work has been sent to the hiring team.{late ? " It arrived after the time limit and is marked as late." : ""} You can close this tab.
      </p>
    </Centered>
  );
}

function Intro({ assessment, onStart }: { assessment: PublicAssessment; onStart: (name: string, email: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limit = assessment.settings.timeLimitMinutes;

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">Technical assessment</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{assessment.title}</h1>
      <div className="mt-5"><Brief source={assessment.scenario} /></div>
      <ul className="mt-6 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
        <li>• You&apos;ll work in an editor in your browser, with a live preview{assessment.hasHiddenTests || Object.keys(assessment.files).some((p) => getRuntime(assessment.runtimeId)?.isTestFile(p)) ? " and tests" : ""}.</li>
        <li>• {limit ? `You have ${limit} minutes once you start.` : "There is no time limit."}</li>
        <li>• AI assistants are {assessment.settings.aiPolicy === "allowed" ? "allowed" : "not allowed"} for this assessment.</li>
        <li>• Your work is saved automatically. We record how your code changes over time, along with your final submission.</li>
        <li>• This link allows one attempt. If you close the tab, return to this link in the same browser to continue.</li>
      </ul>
      <form
        className="mt-8 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true); setError(null);
          try { await onStart(name, email); } catch (err) { setError(err instanceof Error ? err.message : "Could not start."); setBusy(false); }
        }}
      >
        <input className={field} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required aria-label="Your name" />
        <input className={field} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="Email" />
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <button disabled={busy} className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">
          {busy ? "Starting…" : limit ? `Start (${limit} min timer begins)` : "Start"}
        </button>
      </form>
    </main>
  );
}

/** HH:MM:SS, like a wall clock countdown. */
function formatClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

function Working({ token, assessment, session, onSubmitted }: {
  token: string; assessment: PublicAssessment; session: SessionView; onSubmitted: (late: boolean) => void;
}) {
  const runtime = getRuntime(assessment.runtimeId)!;
  const submitRef = useRef<(() => Promise<void>) | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [status, setStatus] = useState<"saved" | "saving" | "error" | "submitting">("saved");
  const [confirm, setConfirm] = useState(false);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = session.deadline === null ? null : session.deadline - now;
  useEffect(() => {
    if (remaining !== null && remaining <= 0 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void submitRef.current?.();
    }
  }, [remaining]);

  const initialKeys = Object.keys(session.files);

  const header = (
    <header className="relative flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 px-4 dark:border-zinc-800">
      <div className="flex min-w-0 items-center gap-3">
        <span className="font-mono text-xl font-medium tracking-[-0.06em]">ctrl</span>
        <span className="hidden truncate text-sm text-zinc-500 md:block">{assessment.title}</span>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 text-center">
        {remaining !== null ? (
          <span className={`font-mono text-3xl font-medium tabular-nums tracking-tight ${remaining < 5 * 60_000 ? "text-rose-600" : ""}`} aria-label="Time remaining" role="timer">
            {formatClock(remaining)}
          </span>
        ) : (
          <span className="text-sm text-zinc-500">No time limit</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-zinc-500 sm:block" aria-live="polite">
          {status === "saving" ? "Saving…" : status === "error" ? "Couldn't save, retrying" : status === "submitting" ? "Submitting…" : "All changes saved"}
        </span>
        {confirm ? (
          <span className="flex items-center gap-2">
            <span className="text-sm">Submit for good?</span>
            <button type="button" onClick={() => { setConfirm(false); void submitRef.current?.(); }} className="rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700">Yes, submit</button>
            <button type="button" onClick={() => setConfirm(false)} className="text-sm text-zinc-500 hover:text-zinc-800">Cancel</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} disabled={status === "submitting"} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            Submit
          </button>
        )}
      </div>
    </header>
  );

  return (
    <WorkspaceShell header={header} brief={assessment.scenario} runtime={runtime} files={session.files} activeFile={runtime.entryFile}>
      <Recorder
        token={token}
        sessionId={session.sessionId}
        runtimeTemplate={boilerplateTemplate(runtime)}
        initialKeys={initialKeys}
        setStatus={setStatus}
        registerSubmit={(fn) => { submitRef.current = fn; }}
        onSubmitted={onSubmitted}
      />
    </WorkspaceShell>
  );
}

/** Invisible component inside the Sandpack context: autosaves, records runs, submits. */
function Recorder({ token, sessionId, runtimeTemplate, initialKeys, setStatus, registerSubmit, onSubmitted }: {
  token: string; sessionId: string; runtimeTemplate: "react" | "vanilla" | null; initialKeys: string[];
  setStatus: (s: "saved" | "saving" | "error" | "submitting") => void;
  registerSubmit: (fn: () => Promise<void>) => void;
  onSubmitted: (late: boolean) => void;
}) {
  const { sandpack } = useSandpack();
  const filesRef = useRef(sandpack.files);
  useEffect(() => { filesRef.current = sandpack.files; });
  const lastSent = useRef<string>("");

  /** Project files as the author defined them, minus untouched template boilerplate Sandpack adds. */
  const collect = useCallback(
    (): FileMap => collectProjectFiles(filesRef.current, initialKeys, runtimeTemplate),
    [initialKeys, runtimeTemplate],
  );

  const save = useCallback(async (reason: "autosave" | "run") => {
    const files = collect();
    const serialized = JSON.stringify(files);
    if (reason === "autosave" && serialized === lastSent.current) return;
    setStatus("saving");
    try {
      await api(`/api/assessments/${token}/sessions/${sessionId}`, { method: "PUT", body: JSON.stringify({ files, reason }) });
      lastSent.current = serialized;
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, [collect, token, sessionId, setStatus]);

  useEffect(() => {
    const id = setInterval(() => void save("autosave"), AUTOSAVE_MS);
    const onRun = () => void save("run");
    window.addEventListener("ctrl-assessment-run", onRun);
    return () => { clearInterval(id); window.removeEventListener("ctrl-assessment-run", onRun); };
  }, [save]);

  useEffect(() => {
    registerSubmit(async () => {
      setStatus("submitting");
      try {
        const result = await api<{ late: boolean }>(`/api/assessments/${token}/sessions/${sessionId}/submit`, {
          method: "POST", body: JSON.stringify({ files: collect() }),
        });
        onSubmitted(result.late);
      } catch (e) {
        setStatus("error");
        window.alert(e instanceof Error ? e.message : "Could not submit. Try again.");
      }
    });
  }, [registerSubmit, token, sessionId, collect, onSubmitted, setStatus]);

  return null;
}
