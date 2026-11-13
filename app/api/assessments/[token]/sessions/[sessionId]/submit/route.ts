import { assessmentIdFromToken, readJson, respond } from "@/lib/assessment/server/http";
import { submitSession } from "@/lib/assessment/server/service";

interface Context {
  params: Promise<{ token: string; sessionId: string }>;
}

/** Final submission. Candidates never receive hidden-test or review data back. */
export async function POST(request: Request, { params }: Context) {
  return respond(async (store) => {
    const { token, sessionId } = await params;
    const id = assessmentIdFromToken("candidate", token);
    const session = await submitSession(store, id, sessionId, await readJson(request));
    return Response.json({ submittedAt: session.submittedAt, late: session.late === true });
  });
}
