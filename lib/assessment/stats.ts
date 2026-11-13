import { filesAtSnapshot, lineDiff } from "./files";
import type { Assessment, Session, SessionStats } from "./types";

/** Process statistics a reviewer sees on the dashboard, derived purely from snapshots. */
export function computeSessionStats(session: Session, assessment: Pick<Assessment, "files">): SessionStats {
  const end = session.submittedAt ?? session.lastSavedAt;
  const runs = session.snapshots.filter((s) => s.reason === "run");
  const start = assessment.files;
  const final = session.files;

  let filesAdded = 0;
  let filesDeleted = 0;
  let filesChanged = 0;
  let linesAdded = 0;
  let linesRemoved = 0;
  for (const path of new Set([...Object.keys(start), ...Object.keys(final)])) {
    const before = start[path];
    const after = final[path];
    if (before === after) continue;
    if (before === undefined) filesAdded++;
    else if (after === undefined) filesDeleted++;
    else filesChanged++;
    for (const line of lineDiff(before ?? "", after ?? "")) {
      if (line.type === "add") linesAdded++;
      else if (line.type === "del") linesRemoved++;
    }
  }

  return {
    durationMs: Math.max(0, end - session.startedAt),
    snapshotCount: session.snapshots.length,
    runCount: runs.length,
    timeToFirstRunMs: runs.length ? runs[0].at : null,
    filesChanged,
    filesAdded,
    filesDeleted,
    linesAdded,
    linesRemoved,
  };
}

export { filesAtSnapshot };
