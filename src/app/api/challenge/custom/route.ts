import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { calculateRoundScore } from "@/domain/game/scoring";

export const dynamic = "force-dynamic";

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
        creator: { select: { id: true, username: true } },
        challengeRounds: { orderBy: { roundNumber: "asc" } },
        participants: { include: { user: { select: { username: true, avatarUrl: true } } }, orderBy: { totalScore: "desc" } },
        _count: { select: { participants: true } },
      },
    });
    return NextResponse.json({ challenges });
  }
  const challenge = await prisma.challenge.findUnique({ where: { inviteToken: token }, select: { id: true, rounds: true, status: true, inviteToken: true, creator: { select: { id: true, username: true } }, challengeRounds: { orderBy: { roundNumber: "asc" }, select: { targetMs: true, roundNumber: true } }, participants: { select: { user: { select: { id: true, username: true } }, totalScore: true, scores: true }, orderBy: { totalScore: "desc" } } } });
  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  const session = await getSession();
  const currentParticipant = session ? challenge.participants.find((participant) => participant.user.id === session.userId) : undefined;
  return NextResponse.json({ challenge, currentParticipant: currentParticipant ? { userId: currentParticipant.user.id, hasPlayed: currentParticipant.scores !== null, totalScore: currentParticipant.totalScore } : null });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { token } = z.object({ token: z.string() }).parse(await req.json());
  const challenge = await prisma.challenge.findUnique({ where: { inviteToken: token }, include: { _count: { select: { participants: true } } } });
  if (!challenge || challenge.status !== "OPEN" || (challenge.maxPlayers && challenge._count.participants >= challenge.maxPlayers)) return NextResponse.json({ error: "Challenge is full or closed" }, { status: 400 });
  const existingParticipant = await prisma.challengeParticipant.findUnique({ where: { challengeId_userId: { challengeId: challenge.id, userId: session.userId } }, select: { scores: true } });
  if (existingParticipant?.scores !== null && existingParticipant?.scores !== undefined) {
    return NextResponse.json({ error: "You already played this challenge. Your score is locked." }, { status: 409 });
  }
  if (!existingParticipant) {
    await prisma.challengeParticipant.create({ data: { challengeId: challenge.id, userId: session.userId } });
    await prisma.notification.create({ data: { userId: session.userId, type: "CHALLENGE_JOINED", title: "Challenge joined", body: "You joined a Precision challenge." } });
  }
  return NextResponse.json({ success: true, challengeId: challenge.id });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { challengeId, results, action } = z.object({
      challengeId: z.string(),
      results: z.array(z.object({ actualMs: z.number().int().min(1).max(60000) })).min(1).max(5).optional(),
      action: z.literal("close").optional(),
    }).parse(await req.json());
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { rounds: true, creatorId: true, status: true, challengeRounds: { orderBy: { roundNumber: "asc" }, select: { targetMs: true, roundNumber: true } } },
    });
    if (action === "close") {
      if (!challenge || challenge.creatorId !== session.userId) return NextResponse.json({ error: "Only the arena creator can close this challenge." }, { status: 403 });
      if (challenge.status === "CLOSED") return NextResponse.json({ success: true });
      await prisma.challenge.update({ where: { id: challengeId }, data: { status: "CLOSED" } });
      return NextResponse.json({ success: true });
    }
    if (!results) return NextResponse.json({ error: "No round results were provided." }, { status: 400 });
    if (!challenge || results.length !== challenge.rounds || challenge.challengeRounds.length !== challenge.rounds) {
      return NextResponse.json({ error: `Submit all ${challenge?.rounds ?? "required"} round results.` }, { status: 400 });
    }
    const storedResults = results.map((result, index) => {
      const targetMs = challenge.challengeRounds[index].targetMs;
      const errorMs = Math.abs(result.actualMs - targetMs);
      return { roundNumber: index + 1, targetMs, actualMs: result.actualMs, errorMs, score: calculateRoundScore(targetMs, result.actualMs) };
    });
    const totalScore = storedResults.reduce((sum, result) => sum + result.score, 0);
    const updated = await prisma.challengeParticipant.updateMany({ where: { challengeId, userId: session.userId, scores: { equals: Prisma.DbNull } }, data: { scores: storedResults, totalScore } });
    if (updated.count === 0) {
      const participant = await prisma.challengeParticipant.findUnique({ where: { challengeId_userId: { challengeId, userId: session.userId } }, select: { id: true, scores: true } });
      if (!participant) return NextResponse.json({ error: "Join this challenge before playing." }, { status: 403 });
      return NextResponse.json({ error: "You already played this challenge. Your score is locked on the leaderboard." }, { status: 409 });
    }
    return NextResponse.json({ success: true, totalScore, results: storedResults });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid challenge result." }, { status: 400 });
    console.error("Custom challenge result save failed", error);
    return NextResponse.json({ error: "Could not save challenge result." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const challengeId = new URL(req.url).searchParams.get("challengeId");
  if (!challengeId) return NextResponse.json({ error: "Challenge id is required." }, { status: 400 });
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId }, select: { creatorId: true } });
  if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
  if (challenge.creatorId !== session.userId) return NextResponse.json({ error: "Only the arena creator can delete this challenge." }, { status: 403 });
  await prisma.challenge.delete({ where: { id: challengeId } });
  return NextResponse.json({ success: true });
}
