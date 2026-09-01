import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const completeSchema = z.object({
  attemptId: z.string(),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { attemptId } = completeSchema.parse(body);

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { roundAttempts: true, challenge: true },
    });

    if (!attempt || attempt.userId !== session.userId) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    if (attempt.status === "COMPLETED") {
      return NextResponse.json({ error: "Attempt is already completed" }, { status: 400 });
    }

    if (attempt.roundAttempts.length !== 5) {
      return NextResponse.json({ error: "Cannot complete without 5 rounds" }, { status: 400 });
    }

    const totalScore = attempt.roundAttempts.reduce((sum, r) => sum + r.score, 0);
    const totalErrorMs = attempt.roundAttempts.reduce((sum, r) => sum + r.errorMs, 0);
    const hasSuspicious = attempt.roundAttempts.some(r => r.validationStatus === "SUSPICIOUS");

    // Start a transaction to update Attempt and Streak
    const completedAt = new Date();
    
    await prisma.$transaction(async (tx) => {
      await tx.attempt.update({
        where: { id: attemptId },
        data: {
          status: "COMPLETED",
          completedAt,
          totalScore,
          totalErrorMs,
          verified: !hasSuspicious,
        },
      });

      if (attempt.mode === "COMPETITIVE" && !hasSuspicious) {
        // Handle Streak logic
        const userStreak = await tx.streak.findUnique({ where: { userId: session.userId } });
        const challengeDate = attempt.challenge.challengeDate.getTime();
        
        if (!userStreak) {
          await tx.streak.create({
            data: {
              userId: session.userId,
              currentStreak: 1,
              longestStreak: 1,
              lastCompletedDate: attempt.challenge.challengeDate,
            }
          });
        } else {
          let newStreak = userStreak.currentStreak;
          const lastDate = userStreak.lastCompletedDate ? userStreak.lastCompletedDate.getTime() : 0;
          const oneDayMs = 24 * 60 * 60 * 1000;
          
          if (lastDate === challengeDate) {
            // Already completed today? Shouldn't happen with 1 competitive attempt per day, but safe fallback
          } else if (challengeDate - lastDate <= oneDayMs * 1.5) { // Roughly 1 day diff
            newStreak += 1;
          } else {
            newStreak = 1;
          }
          
          await tx.streak.update({
            where: { userId: session.userId },
            data: {
              currentStreak: newStreak,
              longestStreak: Math.max(newStreak, userStreak.longestStreak),
              lastCompletedDate: attempt.challenge.challengeDate,
            }
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      totalScore,
      totalErrorMs,
      verified: !hasSuspicious,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
