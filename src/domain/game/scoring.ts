export const MAX_ROUND_SCORE = 1000;
export const ROUND_COUNT = 5;

export const SCORING_EXAMPLES = [
  { errorMs: 0, score: 1000, label: "Perfect" },
  { errorMs: 10, score: 951, label: "Excellent" },
  { errorMs: 50, score: 779, label: "Very close" },
  { errorMs: 100, score: 607, label: "Good try" },
  { errorMs: 200, score: 368, label: "Keep practicing" },
  { errorMs: 500, score: 82, label: "Miss" },
] as const;

export function calculateRoundScore(targetMs: number, actualMs: number): number {
  const error = Math.abs(actualMs - targetMs) / 1000; // error in seconds
  const score = Math.round(MAX_ROUND_SCORE * Math.exp(-error / 0.20));
  return Math.max(0, score);
}

export function getQualitativeFeedback(score: number): "PERFECT" | "GREAT" | "GOOD" | "MISS" {
  if (score >= 950) return "PERFECT";
  if (score >= 800) return "GREAT";
  if (score >= 500) return "GOOD";
  return "MISS";
}
