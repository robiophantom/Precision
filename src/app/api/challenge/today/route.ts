import { NextResponse } from "next/server";
import { getTodayPublishedChallenge } from "@/domain/game/challenge";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const challenge = await getTodayPublishedChallenge();

    if (!challenge) {
      return NextResponse.json({ challenge: null, message: "No active challenge for today." });
    }

    const session = await getSession();
    const attempt = session
      ? await prisma.attempt.findFirst({
        where: { userId: session.userId, challengeId: challenge.id, mode: "COMPETITIVE" },
          select: { id: true, status: true, totalScore: true, totalErrorMs: true },
        })
      : null;

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        date: challenge.challengeDate,
        rounds: challenge.rounds.map((r) => ({
          roundNumber: r.roundNumber,
          targetMs: r.targetMs,
        })),
      },
      hasPlayed: Boolean(attempt),
      attempt: attempt
        ? { status: attempt.status, totalScore: attempt.totalScore, totalErrorMs: attempt.totalErrorMs }
        : null,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch today's challenge" }, { status: 500 });
  }
}
