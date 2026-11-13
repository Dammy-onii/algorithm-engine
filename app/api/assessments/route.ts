import { readJson, respond } from "@/lib/assessment/server/http";
import { createLinkToken } from "@/lib/assessment/server/link";
import { createAssessment } from "@/lib/assessment/server/service";

/** Create an assessment. Returns the candidate link and the (private) reviewer link. */
export async function POST(request: Request) {
  return respond(async (store) => {
    const assessment = await createAssessment(store, await readJson(request));
    return Response.json({
      id: assessment.id,
      candidatePath: `/a/${createLinkToken("candidate", assessment.id)}`,
      reviewPath: `/review/${createLinkToken("review", assessment.id)}`,
    });
  });
}
