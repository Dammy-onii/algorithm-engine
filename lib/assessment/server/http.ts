import { assessmentsEnabled } from "../flag";
import { getAssessmentStore } from "../storage";
import type { AssessmentStore } from "../storage/types";
import { verifyLinkToken, type LinkKind } from "./link";
import { ServiceError } from "./service";

const MAX_BODY_BYTES = 3_500_000;

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new ServiceError("invalid", "Request is too large.");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ServiceError("invalid", "Request must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ServiceError("invalid", "Request must be a JSON object.");
  }
  return body as Record<string, unknown>;
}

/** Resolve the assessment id from a signed token, or throw a 404 (no hint whether it exists). */
export function assessmentIdFromToken(kind: LinkKind, token: string): string {
  const id = verifyLinkToken(kind, token);
  if (!id) throw new ServiceError("not_found", "Link not found.");
  return id;
}

/** Wrap a route body: provides the store and converts errors into JSON responses. */
export async function respond(run: (store: AssessmentStore) => Promise<Response>): Promise<Response> {
  try {
    if (!assessmentsEnabled()) throw new ServiceError("not_found", "Not found.");
    return await run(getAssessmentStore());
  } catch (error) {
    if (error instanceof ServiceError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error.";
    const notConfigured = message.startsWith("Assessment storage is not configured");
    return Response.json({ error: notConfigured ? message : "Something went wrong." }, { status: notConfigured ? 503 : 500 });
  }
}
