"use client";

import { useState } from "react";

import { copyText } from "@/shared/browser/copyText";

export function interviewSharePath(challengeId: string): string {
  return `/interview/${encodeURIComponent(challengeId)}`;
}

export function ShareInterviewLink({
  challengeId,
  sharePath,
  compact = false,
}: {
  challengeId?: string;
  sharePath?: string;
  compact?: boolean;
}) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    if (!sharePath && !challengeId) return;
    const path = sharePath ?? interviewSharePath(challengeId!);
    const url = `${window.location.origin}${path}`;
    setShareUrl(url);
    setCopied(await copyText(url));
  };

  const copyGeneratedLink = async () => {
    if (!shareUrl) return;
    setCopied(await copyText(shareUrl));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={generateLink}
        className={
          compact
            ? "block rounded-lg px-2 py-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:px-3 sm:text-sm"
            : "inline-flex h-9 items-center rounded-lg px-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        }
      >
        {shareUrl && copied
          ? "Link copied"
          : compact
            ? "Copy link"
            : "Share interview"}
      </button>

      {shareUrl && (
        <div className="absolute right-0 top-11 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-zinc-200 bg-white p-3 text-zinc-900 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold">Shareable interview link</p>
            <button
              type="button"
              onClick={() => setShareUrl(null)}
              aria-label="Close share link"
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              ×
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={shareUrl}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              aria-label="Generated interview link"
              className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 font-mono text-[11px] outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
            <button
              type="button"
              onClick={copyGeneratedLink}
              className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-emerald-500/15 dark:text-emerald-400"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {!copied && (
            <p className="mt-2 text-[11px] text-zinc-500">
              Automatic copying is unavailable. Select and copy the displayed
              link manually.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
