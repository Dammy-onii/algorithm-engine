import type { BrainSource } from "@/lib/engine/simulation";
import { getChallenge } from "@/lib/content/registry";
import type {
  InterviewScenarioResult,
  InterviewStreamEvent,
} from "@/lib/interview/types";
import {
  evaluateFinanceScenario,
  summarizeFinanceSubmission,
} from "@/lib/interview/server/evaluateFinanceSubmission";
import { financeInterviewSuite } from "@/lib/interview/server/financeSuites";
import {
  evaluateParkingScenario,
  summarizeParkingSubmission,
} from "@/lib/interview/server/evaluateParkingSubmission";
import { parkingInterviewSuite } from "@/lib/interview/server/parkingSuites";
import { assertInterviewSubmissionBudget } from "@/lib/interview/server/submissionBudget";

interface SubmissionBody {
  challengeId?: unknown;
  brain?: unknown;
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 120_000) {
    return Response.json(
      { error: "Submission payload is too large." },
      { status: 413 },
    );
  }

  let body: SubmissionBody;
  try {
    body = (await request.json()) as SubmissionBody;
  } catch {
    return Response.json({ error: "Submission must be valid JSON." }, { status: 400 });
  }

  if (typeof body.challengeId !== "string" || !body.brain || typeof body.brain !== "object") {
    return Response.json(
      { error: "challengeId and a compiled brain are required." },
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
      { error: "This challenge does not have a hidden interview suite." },
      { status: 404 },
    );
  }

  try {
    const brain = body.brain as BrainSource;
    assertInterviewSubmissionBudget(brain);
    const suite =
      challenge.pack === "parking"
        ? parkingInterviewSuite(evaluation.suiteId)
        : financeInterviewSuite(evaluation.suiteId);
    if (!suite) throw new Error(`Unknown interview suite '${evaluation.suiteId}'.`);
    const evaluateScenario =
      challenge.pack === "parking"
        ? evaluateParkingScenario
        : evaluateFinanceScenario;
    const summarizeSubmission =
      challenge.pack === "parking"
        ? summarizeParkingSubmission
        : summarizeFinanceSubmission;

    const encoder = new TextEncoder();
    const results: InterviewScenarioResult[] = [];
    let index = 0;
    let phase: "suite-start" | "scenario-start" | "scenario-result" =
      "suite-start";

    const eventLine = (event: InterviewStreamEvent) =>
      encoder.encode(`${JSON.stringify(event)}\n`);

    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        try {
          if (phase === "suite-start") {
            controller.enqueue(
              eventLine({
                type: "suite-start",
                suiteId: evaluation.suiteId,
                scenarioCount: suite.length,
                passingScore: evaluation.passingScore,
              }),
            );
            phase = "scenario-start";
            return;
          }

          if (phase === "scenario-start") {
            if (index >= suite.length) {
              controller.enqueue(
                eventLine({
                  type: "suite-complete",
                  report: summarizeSubmission(
                    evaluation.suiteId,
                    results,
                    evaluation.passingScore,
                  ),
                }),
              );
              controller.close();
              return;
            }
            controller.enqueue(
              eventLine({
                type: "scenario-start",
                index,
                scenarioCount: suite.length,
                label: suite[index].label,
              }),
            );
            phase = "scenario-result";
            return;
          }

          if (phase === "scenario-result") {
            const scenario = evaluateScenario(
              // The selected suite and evaluator are paired by challenge pack.
              suite[index] as never,
              brain,
            );
            results.push(scenario);
            controller.enqueue(
              eventLine({ type: "scenario-result", index, scenario }),
            );
            index += 1;
            phase = "scenario-start";
            return;
          }
        } catch (error) {
          controller.enqueue(
            eventLine({
              type: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "The hidden scenario could not be evaluated.",
            }),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The submitted policy could not be evaluated.",
      },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }
}
