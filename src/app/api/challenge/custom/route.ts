import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({ rounds: z.array(z.number().int().min(100).max(10000)).min(1).max(5), maxPlayers: z.number().int().min(2).optional(), friendIds: z.array(z.string()).optional() });
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { rounds, maxPlayers, friendIds = [] } = schema.parse(await req.json());
    const challenge = await prisma.challenge.create({ data: { creatorId: session.userId, rounds: rounds.length, maxPlayers, challengeRounds: { create: rounds.map((targetMs, index) => ({ roundNumber: index + 1, targetMs })) }, participants: { create: { userId: session.userId } } }, include: { challengeRounds: true } });
    if (friendIds.length) {
      const accepted = await prisma.friendship.findMany({ where: { status: "ACCEPTED", OR: [{ requesterId: session.userId, recipientId: { in: friendIds } }, { recipientId: session.userId, requesterId: { in: friendIds } }] }, select: { requesterId: true, recipientId: true } });
      const acceptedIds = new Set(accepted.map((friendship) => friendship.requesterId === session.userId ? friendship.recipientId : friendship.requesterId));
      const validFriendIds = friendIds.filter((userId) => acceptedIds.has(userId) && userId !== session.userId);
      await prisma.notification.createMany({ data: validFriendIds.map((userId) => ({ userId, type: "CHALLENGE_INVITE", title: "New Precision challenge", body: `@${session.username} invited you to a challenge.` })) });
    }
    return NextResponse.json({ challengeId: challenge.id, inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin}/challenge/${challenge.inviteToken}` });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Choose between 1 and 5 valid round targets." }, { status: 400 });
    return NextResponse.json({ error: "Could not create challenge" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const challenges = await prisma.challenge.findMany({
      where: { OR: [{ creatorId: session.userId }, { participants: { some: { userId: session.userId } } }] },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        creator: { select: { username: true } },
        challengeRounds: { orderBy: { roundNumber: "asc" } },
        participants: { include: { user: { select: { username: true, avatarUrl: true } } }, orderBy: { totalScore: "desc" } },
        _count: { select: { participants: true } },
      },
    });
    return NextResponse.json({ challenges });
  }
  const challenge = await prisma.challenge.findUnique({ where: { inviteToken: token }, include: { challengeRounds: { orderBy: { roundNumber: "asc" } }, creator: { select: { username: true } }, participants: { include: { user: { select: { id: true, username: true, avatarUrl: true } } }, orderBy: { totalScore: "desc" } }, _count: { select: { participants: true } } } });
  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  const session = await getSession();
  const currentParticipant = session ? challenge.participants.find((participant) => participant.user.id === session.userId) : undefined;
  return NextResponse.json({ challenge, currentParticipant: currentParticipant ? { hasPlayed: currentParticipant.scores !== null, totalScore: currentParticipant.totalScore } : null });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { token } = z.object({ token: z.string() }).parse(await req.json());
  const challenge = await prisma.challenge.findUnique({ where: { inviteToken: token }, include: { _count: { select: { participants: true } } } });
  if (!challenge || challenge.status !== "OPEN" || (challenge.maxPlayers && challenge._count.participants >= challenge.maxPlayers)) return NextResponse.json({ error: "Challenge is full or closed" }, { status: 400 });
  await prisma.challengeParticipant.upsert({ where: { challengeId_userId: { challengeId: challenge.id, userId: session.userId } }, create: { challengeId: challenge.id, userId: session.userId }, update: {} });
  await prisma.notification.create({ data: { userId: session.userId, type: "CHALLENGE_JOINED", title: "Challenge joined", body: "You joined a Precision challenge." } });
  return NextResponse.json({ success: true, challengeId: challenge.id });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { challengeId, scores } = z.object({ challengeId: z.string(), scores: z.array(z.number().int().min(0)).min(1).max(5) }).parse(await req.json());
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId }, select: { rounds: true } });
    if (!challenge || scores.length !== challenge.rounds) return NextResponse.json({ error: `Submit exactly ${challenge?.rounds ?? "all"} round scores.` }, { status: 400 });
    const participant = await prisma.challengeParticipant.findUnique({ where: { challengeId_userId: { challengeId, userId: session.userId } } });
    if (!participant) return NextResponse.json({ error: "Join this challenge before playing." }, { status: 403 });
    if (participant.scores !== null) return NextResponse.json({ error: "You already played this challenge. Your score is locked on the leaderboard." }, { status: 409 });
    const updated = await prisma.challengeParticipant.update({ where: { id: participant.id }, data: { scores, totalScore: scores.reduce((sum, score) => sum + score, 0) } });
    return NextResponse.json({ success: true, totalScore: updated.totalScore });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid challenge result." }, { status: 400 });
    return NextResponse.json({ error: "Could not save challenge result." }, { status: 500 });
  }
}
