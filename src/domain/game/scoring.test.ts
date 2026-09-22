import { describe, it, expect } from "vitest";
import { calculateRoundScore, getQualitativeFeedback, SCORING_EXAMPLES } from "./scoring";

describe("Scoring Logic", () => {
  it("calculates perfect score for 0 error", () => {
    expect(calculateRoundScore(1000, 1000)).toBe(1000);
  });

  it("calculates lower score for large error", () => {
    const score = calculateRoundScore(1000, 1500); // 500ms error
    expect(score).toBeLessThan(100);
  });

  it("calculates exactly correctly according to formula", () => {
    const score = calculateRoundScore(1000, 1200);
    // formula: 1000 * exp(-0.2 / 0.2) = 1000 * exp(-1) = 368
    expect(score).toBe(368);
  });

  it("scores the same for being early or late by the same amount", () => {
    expect(calculateRoundScore(2000, 1900)).toBe(calculateRoundScore(2000, 2100));
  });

  it("never returns a negative score", () => {
    expect(calculateRoundScore(1000, 60000)).toBe(0);
  });

  it("matches the examples shown to players", () => {
    for (const example of SCORING_EXAMPLES) {
      expect(calculateRoundScore(1000, 1000 + example.errorMs)).toBe(example.score);
    }
  });

  it("provides correct qualitative feedback", () => {
    expect(getQualitativeFeedback(980)).toBe("PERFECT");
    expect(getQualitativeFeedback(850)).toBe("GREAT");
    expect(getQualitativeFeedback(550)).toBe("GOOD");
    expect(getQualitativeFeedback(300)).toBe("MISS");
  });
});
