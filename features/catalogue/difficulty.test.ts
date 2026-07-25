import { describe, expect, it } from "vitest";

import { ChallengeData } from "@/lib/authoring/types";
import { difficultyFor } from "@/features/catalogue/difficulty";

function challenge(
  difficulty: ChallengeData["difficulty"],
  stage?: ChallengeData["stage"],
): ChallengeData {
  return { difficulty, stage } as ChallengeData;
}

describe("level-directory difficulty", () => {
  it("uses an explicitly authored stage before the legacy editor difficulty", () => {
    expect(difficultyFor(challenge(1, "easy"))).toBe("easy");
    expect(difficultyFor(challenge(1, "medium"))).toBe("medium");
    expect(difficultyFor(challenge(2, "hard"))).toBe("hard");
  });

  it("falls back to the legacy difficulty when no stage is authored", () => {
    expect(difficultyFor(challenge(1))).toBe("example");
    expect(difficultyFor(challenge(2))).toBe("easy");
    expect(difficultyFor(challenge(3))).toBe("medium");
  });
});
