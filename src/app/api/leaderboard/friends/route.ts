import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { addSocialMetadata } from "@/lib/leaderboard/social";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const requestedDate = new URL(req.url).searchParams.get("date");
    const date = new Date();
    if (requestedDate === "yesterday") date.setUTCDate(date.getUTCDate() - 1);
    const challenge = await prisma.dailyChallenge.findFirst({
      where: { challengeDate: new Date(date.toISOString().slice(0, 10)), status: "PUBLISHED" },
      select: { id: true, challengeDate: true },
    });
    if (!challenge) return NextResponse.json({ leaderboard: [] });

    const friendships = await prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: session.userId }, { recipientId: session.userId }] },
      select: { requesterId: true, recipientId: true },
    });
    const friendIds = friendships.map((friendship) =>
      friendship.requesterId === session.userId ? friendship.recipientId : friendship.requesterId
    );

    const attempts = await prisma.attempt.findMany({
      where: {
        challengeId: challenge.id,
        mode: "COMPETITIVE",
        status: "COMPLETED",
        verified: true,
        userId: { in: [session.userId, ...friendIds] },
      },
      orderBy: [{ totalScore: "desc" }, { totalErrorMs: "asc" }, { completedAt: "asc" }],
      select: { totalScore: true, totalErrorMs: true, user: { select: { id: true, username: true, avatarUrl: true } } },
    });

    const leaderboard = attempts.map((attempt, index) => ({
        rank: index + 1,
        userId: attempt.user.id,
        username: attempt.user.username,
        avatarUrl: attempt.user.avatarUrl,
        score: attempt.totalScore,
        errorMs: attempt.totalErrorMs,
      }));
    await prisma.leaderboardSnapshot.upsert({
      where: { challengeDate_scope: { challengeDate: challenge.challengeDate, scope: "FRIENDS" } },
      create: { challengeDate: challenge.challengeDate, scope: "FRIENDS", entries: { create: leaderboard.map((entry) => ({ userId: entry.userId, rank: entry.rank, score: entry.score, errorMs: entry.errorMs })) } },
      update: { entries: { deleteMany: {}, create: leaderboard.map((entry) => ({ userId: entry.userId, rank: entry.rank, score: entry.score, errorMs: entry.errorMs })) } },
    });
    return NextResponse.json({ leaderboard: await addSocialMetadata(leaderboard, "DAILY_FRIENDS", challenge.id, session.userId), challengeDate: challenge.challengeDate, challengeId: challenge.id });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
