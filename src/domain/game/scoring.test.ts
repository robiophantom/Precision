import { describe, it, expect } from "vitest";
import { calculateRoundScore, getQualitativeFeedback } from "./scoring";

describe("Scoring Logic", () => {
  it("calculates perfect score for 0 error", () => {
    expect(calculateRoundScore(1000, 1000)).toBe(1000);
  });

  it("calculates lower score for large error", () => {
    const score = calculateRoundScore(1000, 1500); // 500ms error
    expect(score).toBeLessThan(100);
  });

  it("calculates exactly correctly according to formula", () => {
    const errorMs = 200; // 0.2s
    const score = calculateRoundScore(1000, 1200); 
    // formula: 1000 * exp(-0.2 / 0.2) = 1000 * exp(-1) = 368
    expect(score).toBe(368);
  });

  it("provides correct qualitative feedback", () => {
    expect(getQualitativeFeedback(980)).toBe("PERFECT");
    expect(getQualitativeFeedback(850)).toBe("GREAT");
    expect(getQualitativeFeedback(550)).toBe("GOOD");
    expect(getQualitativeFeedback(300)).toBe("MISS");
  });
});
