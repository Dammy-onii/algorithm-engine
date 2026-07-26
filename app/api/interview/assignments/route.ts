import {
  createInterviewAssignmentId,
  resolveInterviewAssignment,
} from "@/lib/interview/server/assignmentToken";

interface AssignmentRequest {
  challengeIds?: unknown;
}

export async function POST(request: Request) {
  let body: AssignmentRequest;
  try {
    body = (await request.json()) as AssignmentRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    !Array.isArray(body.challengeIds) ||
    body.challengeIds.some((id) => typeof id !== "string")
  ) {
    return Response.json(
      { error: "challengeIds must be an array of challenge IDs." },
      { status: 400 },
    );
  }

  try {
    const assignmentId = createInterviewAssignmentId(body.challengeIds);
    const assignment = resolveInterviewAssignment(assignmentId);
    if (!assignment) throw new Error("Could not verify the assignment.");

    return Response.json({
      assignmentId,
      challengeIds: assignment.challengeIds,
      path: `/i/${assignmentId}`,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create the interview assignment.",
      },
      { status: 400 },
    );
  }
}
