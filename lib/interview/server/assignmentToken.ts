import { createHmac, timingSafeEqual } from "node:crypto";

import { CHALLENGES } from "@/content/challenges";
import type { ChallengeData } from "@/lib/authoring/types";
import {
  normalizeInterviewSelection,
  type InterviewAssignment,
} from "@/lib/interview/assignment";

/**
 * Version 3 is also the current global link-revocation generation.
 *
 * Versions 1 and 2 were deliberately retired on 2026-07-26 when all previously
 * issued interview links were cleared. Supporting them here would silently
 * reactivate those links.
 */
const TOKEN_VERSION = 3;
const SIGNATURE_BYTES = 6;
const MAX_ASSIGNMENT_PROBLEMS = 20;
const PACK_CODES = ["maze", "warehouse", "finance", "parking"] as const;
const DEVELOPMENT_SECRET =
  "algorithm-engine-development-interview-link-v1";

function assignmentSecret(): string {
  return process.env.INTERVIEW_LINK_SECRET || DEVELOPMENT_SECRET;
}

function signature(payload: Buffer): Buffer {
  return createHmac("sha256", assignmentSecret())
    .update(payload)
    .digest()
    .subarray(0, SIGNATURE_BYTES);
}

/** Create a compact, signed, stateless assignment id from registry references. */
export function createInterviewAssignmentId(challengeIds: string[]): string {
  const challenges = normalizeInterviewSelection(challengeIds);
  if (challenges.length > MAX_ASSIGNMENT_PROBLEMS) {
    throw new Error(
      `An interview assignment may contain at most ${MAX_ASSIGNMENT_PROBLEMS} problems.`,
    );
  }

  const packCode = PACK_CODES.indexOf(
    challenges[0].pack as (typeof PACK_CODES)[number],
  );
  if (packCode < 0) {
    throw new Error(
      `World '${challenges[0].pack}' does not yet have a compact assignment code.`,
    );
  }

  // v3 includes one stable world code because challenge numbers are unique only
  // inside a world (Maze and Warehouse, for example, both use level number 6).
  const payload = Buffer.alloc(3 + challenges.length * 2);
  payload.writeUInt8(TOKEN_VERSION, 0);
  payload.writeUInt8(challenges.length, 1);
  payload.writeUInt8(packCode, 2);

  challenges.forEach((challenge, index) => {
    if (challenge.number < 0 || challenge.number > 65_535) {
      throw new Error(`Challenge '${challenge.id}' has an invalid number.`);
    }
    payload.writeUInt16BE(challenge.number, 3 + index * 2);
  });

  return Buffer.concat([payload, signature(payload)]).toString("base64url");
}

/** Verify and resolve a compact assignment id against the current registry. */
export function resolveInterviewAssignment(
  assignmentId: string,
): InterviewAssignment | undefined {
  let bytes: Buffer;
  try {
    bytes = Buffer.from(assignmentId, "base64url");
  } catch {
    return undefined;
  }

  if (bytes.length < 2 + SIGNATURE_BYTES) return undefined;
  const payload = bytes.subarray(0, -SIGNATURE_BYTES);
  const receivedSignature = bytes.subarray(-SIGNATURE_BYTES);
  const expectedSignature = signature(payload);
  if (
    receivedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    return undefined;
  }

  const version = payload.readUInt8(0);
  const count = payload.readUInt8(1);
  if (
    count === 0 ||
    count > MAX_ASSIGNMENT_PROBLEMS
  ) {
    return undefined;
  }

  if (version !== TOKEN_VERSION || payload.length !== 3 + count * 2) {
    return undefined;
  }
  const packId = PACK_CODES[payload.readUInt8(2)];
  if (!packId) return undefined;
  const challenges: Array<ChallengeData | undefined> = Array.from(
    { length: count },
    (_, index) => {
      const number = payload.readUInt16BE(3 + index * 2);
      return CHALLENGES.find(
        (challenge) =>
          challenge.pack === packId && challenge.number === number,
      );
    },
  );
  if (challenges.some((challenge) => !challenge)) return undefined;

  try {
    const normalized = normalizeInterviewSelection(
      challenges.map((challenge) => challenge!.id),
    );
    const challengeIds = normalized.map((challenge) => challenge.id);
    if (
      challengeIds.length !== challenges.length ||
      challengeIds.some((id, index) => id !== challenges[index]!.id)
    ) {
      return undefined;
    }
    return { id: assignmentId, challengeIds };
  } catch {
    return undefined;
  }
}
