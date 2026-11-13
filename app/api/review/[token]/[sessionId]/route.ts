import { assessmentIdFromToken, readJson, respond } from "@/lib/assessment/server/http";
import { saveReview } from "@/lib/assessment/server/service";

interface Context {
  params: Promise<{ token: string; sessionId: string }>;
}

/** Save a reviewer's rubric scores, notes and recommendation. Needs the private review token. */
export async function PUT(request: Request, { params }: Context) {
  return respond(async (store) => {
    const { token, sessionId } = await params;
    const id = assessmentIdFromToken("review", token);
    return Response.json(await saveReview(store, id, sessionId, await readJson(request)));
  });
}
