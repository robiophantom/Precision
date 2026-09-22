import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const challenge = await prisma.dailyChallenge.findFirst({
      where: { challengeDate: new Date(new Date().toISOString().slice(0, 10)), status: "PUBLISHED" },
      select: { id: true },
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

    return NextResponse.json({
      leaderboard: attempts.map((attempt, index) => ({
        rank: index + 1,
        userId: attempt.user.id,
        username: attempt.user.username,
        avatarUrl: attempt.user.avatarUrl,
        score: attempt.totalScore,
        errorMs: attempt.totalErrorMs,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
