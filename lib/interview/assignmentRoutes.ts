export function interviewAssignmentPath(assignmentId: string): string {
  return `/i/${encodeURIComponent(assignmentId)}`;
}

export function interviewAssignmentProblemPath(
  assignmentId: string,
  challengeId: string,
): string {
  return `${interviewAssignmentPath(assignmentId)}/${encodeURIComponent(challengeId)}`;
}
