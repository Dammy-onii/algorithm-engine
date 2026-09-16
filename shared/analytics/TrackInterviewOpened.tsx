"use client";

import { useEffect } from "react";
import { testTracking } from "./track";

/**
 * Fires the `test_interview_opened` event once when a shared interview link's problem
 * list renders. The directory page is a server component, so this small client child
 * carries the browser-only tracking call.
 */
export function TrackInterviewOpened({
  assignmentId,
  world,
}: {
  assignmentId: string;
  world: string;
}) {
  useEffect(() => {
    testTracking.interviewOpened(assignmentId, world);
  }, [assignmentId, world]);

  return null;
}
