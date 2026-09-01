export function calculateRoundScore(targetMs: number, actualMs: number): number {
  const error = Math.abs(actualMs - targetMs) / 1000; // error in seconds
  const score = Math.round(1000 * Math.exp(-error / 0.20));
  return Math.max(0, score);
}

export function getQualitativeFeedback(score: number): "PERFECT" | "GREAT" | "GOOD" | "MISS" {
  if (score >= 950) return "PERFECT";
  if (score >= 800) return "GREAT";
  if (score >= 500) return "GOOD";
  return "MISS";
}
