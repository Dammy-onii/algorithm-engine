import { getChallenge } from "@/lib/content/registry";
import type { InterviewDemoSuite } from "@/lib/interview/demoTypes";
import { financeInterviewSuite } from "@/lib/interview/server/financeSuites";
import { parkingInterviewSuite } from "@/lib/interview/server/parkingSuites";

interface DemoSuiteBody {
  challengeId?: unknown;
}

export async function POST(request: Request) {
  let body: DemoSuiteBody;
  try {
    body = (await request.json()) as DemoSuiteBody;
  } catch {
    return Response.json(
      { error: "Submission must be valid JSON." },
      { status: 400 },
    );
  }

  if (typeof body.challengeId !== "string") {
    return Response.json(
      { error: "challengeId is required." },
      { status: 400 },
    );
  }

  const challenge = getChallenge(body.challengeId);
  const evaluation = challenge?.interviewEvaluation;
  if (
    !challenge ||
    !evaluation ||
    (challenge.pack !== "finance" && challenge.pack !== "parking")
  ) {
    return Response.json(
      { error: "This challenge does not have a demo interview suite." },
      { status: 404 },
    );
  }

  let payload: InterviewDemoSuite;
  if (challenge.pack === "parking") {
    const scenarios = parkingInterviewSuite(evaluation.suiteId);
    if (!scenarios) {
      return Response.json(
        { error: `Unknown interview suite '${evaluation.suiteId}'.` },
        { status: 404 },
      );
    }
    payload = {
      mode: "browser-demo",
      pack: "parking",
      suiteId: evaluation.suiteId,
      passingScore: evaluation.passingScore,
      scenarios,
    };
  } else {
    const scenarios = financeInterviewSuite(evaluation.suiteId);
    if (!scenarios) {
      return Response.json(
        { error: `Unknown interview suite '${evaluation.suiteId}'.` },
        { status: 404 },
      );
    }
    payload = {
      mode: "browser-demo",
      pack: "finance",
      suiteId: evaluation.suiteId,
      passingScore: evaluation.passingScore,
      scenarios,
    };
  }

  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
