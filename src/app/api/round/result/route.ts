import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { calculateRoundScore } from "@/domain/game/scoring";

const roundResultSchema = z.object({
  attemptId: z.string(),
  roundNumber: z.number().int().min(1).max(5),
  clientStartTimestamp: z.number().optional(),
  clientTapTimestamp: z.number().optional(),
  measuredMs: z.number().int().nonnegative(),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { attemptId, roundNumber, clientStartTimestamp, clientTapTimestamp, measuredMs } = roundResultSchema.parse(body);

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        challenge: {
          include: { rounds: true },
        },
      },
    });

    if (!attempt || attempt.userId !== session.userId) {
      return NextResponse.json({ error: "Attempt not found or unauthorized" }, { status: 404 });
    }
    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Attempt is already completed" }, { status: 400 });
    }

    const challengeRound = attempt.challenge.rounds.find(r => r.roundNumber === roundNumber);
    if (!challengeRound) {
      return NextResponse.json({ error: "Invalid round" }, { status: 400 });
    }

    const existingRound = await prisma.roundAttempt.findUnique({
      where: { attemptId_roundNumber: { attemptId, roundNumber } }
    });
    if (existingRound) {
      return NextResponse.json({ error: "Round already recorded" }, { status: 400 });
    }

    const errorMs = Math.abs(measuredMs - challengeRound.targetMs);
    const score = calculateRoundScore(challengeRound.targetMs, measuredMs);
    let validationStatus = "PENDING";
    
    // Very basic anti-cheat heuristic for V1:
    // If the difference between client timestamps doesn't closely match measuredMs, mark suspicious.
    if (clientStartTimestamp && clientTapTimestamp) {
      const calculatedDuration = clientTapTimestamp - clientStartTimestamp;
      if (Math.abs(calculatedDuration - measuredMs) > 100) {
        validationStatus = "SUSPICIOUS";
      }
    }

    const roundResult = await prisma.roundAttempt.create({
      data: {
        attemptId,
        challengeRoundId: challengeRound.id,
        roundNumber,
        clientStartTimestamp: clientStartTimestamp ? BigInt(Math.floor(clientStartTimestamp)) : null,
        clientTapTimestamp: clientTapTimestamp ? BigInt(Math.floor(clientTapTimestamp)) : null,
        measuredMs,
        errorMs,
        score,
        validationStatus,
      },
    });

    return NextResponse.json({
      success: true,
      score,
      errorMs,
      validationStatus,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
