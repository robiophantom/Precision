import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { addSocialMetadata } from "@/lib/leaderboard/social";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    
    let challengeDate = new Date();
    if (dateParam === "yesterday") {
      challengeDate.setUTCDate(challengeDate.getUTCDate() - 1);
    } else if (dateParam) {
      challengeDate = new Date(dateParam);
    }
    challengeDate.setUTCHours(0, 0, 0, 0);

    const challenge = await prisma.dailyChallenge.findFirst({
      where: {
        challengeDate,
        status: "PUBLISHED",
      },
      select: { id: true, challengeDate: true },
    });

    if (!challenge) {
      return NextResponse.json({ leaderboard: [] });
    }

    const attempts = await prisma.attempt.findMany({
      where: {
        challengeId: challenge.id,
        mode: "COMPETITIVE",
        status: "COMPLETED",
        verified: true, // Only verified attempts show up
      },
      orderBy: [
        { totalScore: "desc" },
        { totalErrorMs: "asc" },
        { completedAt: "asc" },
      ],
      take: 100, // Top 100 for now
      select: {
        id: true,
        totalScore: true,
        totalErrorMs: true,
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          }
        }
      }
    });

    const leaderboard = attempts.map((a, index) => ({
      rank: index + 1,
      userId: a.user.id,
      username: a.user.username,
      avatarUrl: a.user.avatarUrl,
      score: a.totalScore,
      errorMs: a.totalErrorMs,
    }));

    await prisma.leaderboardSnapshot.upsert({
      where: { challengeDate_scope: { challengeDate: challenge.challengeDate, scope: "GLOBAL" } },
      create: { challengeDate: challenge.challengeDate, scope: "GLOBAL", entries: { create: leaderboard.map((entry) => ({ userId: entry.userId, rank: entry.rank, score: entry.score, errorMs: entry.errorMs })) } },
      update: { entries: { deleteMany: {}, create: leaderboard.map((entry) => ({ userId: entry.userId, rank: entry.rank, score: entry.score, errorMs: entry.errorMs })) } },
    });

    const session = await getSession();
    return NextResponse.json({ leaderboard: await addSocialMetadata(leaderboard, "DAILY_GLOBAL", challenge.id, session?.userId), challengeDate: challenge.challengeDate, challengeId: challenge.id });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
