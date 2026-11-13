import { assessmentIdFromToken, readJson, respond } from "@/lib/assessment/server/http";
import { startSession } from "@/lib/assessment/server/service";

interface Context {
  params: Promise<{ token: string }>;
}

/** Start the single attempt a link allows, or resume it with the saved session id. */
export async function POST(request: Request, { params }: Context) {
  return respond(async (store) => {
    const id = assessmentIdFromToken("candidate", (await params).token);
    const { view, resumed } = await startSession(store, id, await readJson(request));
    return Response.json({ ...view, resumed });
  });
}
