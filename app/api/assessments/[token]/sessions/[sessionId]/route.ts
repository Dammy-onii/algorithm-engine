import { assessmentIdFromToken, readJson, respond } from "@/lib/assessment/server/http";
import { saveProgress } from "@/lib/assessment/server/service";

interface Context {
  params: Promise<{ token: string; sessionId: string }>;
}

/** Autosave the working files, or record a test/preview run. */
export async function PUT(request: Request, { params }: Context) {
  return respond(async (store) => {
    const { token, sessionId } = await params;
    const id = assessmentIdFromToken("candidate", token);
    const view = await saveProgress(store, id, sessionId, await readJson(request));
    return Response.json({ lastSavedFiles: Object.keys(view.files).length, deadline: view.deadline });
  });
}
