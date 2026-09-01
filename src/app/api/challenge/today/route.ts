import { NextResponse } from "next/server";
import { getTodayPublishedChallenge } from "@/domain/game/challenge";

export async function GET() {
  try {
    const challenge = await getTodayPublishedChallenge();

    if (!challenge) {
      return NextResponse.json({ challenge: null, message: "No active challenge for today." });
    }

    // We only expose round numbers and targets. DO NOT expose sensitive challenge fields to client.
    return NextResponse.json({
      challenge: {
        id: challenge.id,
        date: challenge.challengeDate,
        rounds: challenge.rounds.map((r) => ({
          roundNumber: r.roundNumber,
          targetMs: r.targetMs,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch today's challenge" }, { status: 500 });
  }
}
